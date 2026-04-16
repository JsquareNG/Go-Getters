from collections import defaultdict

def get_field_value(obj, field_name: str):
    return getattr(obj, field_name, None)


def evaluate_condition(field_value, condition, config):
    operator = (condition.operator or "").upper()
    value_type = (condition.value_type or "").upper()

    if operator == "ELSE":
        return True

    if value_type == "STRING":
        compare_value = condition.string_value

        if field_value is None:
            return False

        if operator == "EQ":
            return str(field_value) == str(compare_value)

        if operator == "NEQ":
            return str(field_value) != str(compare_value)

    elif value_type == "NUMBER":
        compare_value = condition.numeric_value

        try:
            field_num = float(field_value)
        except (TypeError, ValueError):
            return False

        if compare_value is None:
            return False

        if operator == "EQ":
            return field_num == compare_value
        if operator == "NEQ":
            return field_num != compare_value
        if operator == "GT":
            return field_num > compare_value
        if operator == "GTE":
            return field_num >= compare_value
        if operator == "LT":
            return field_num < compare_value
        if operator == "LTE":
            return field_num <= compare_value
        if operator == "ELSE":
            return True

    elif value_type == "BOOLEAN":
        compare_value = condition.boolean_value

        if operator == "IS_TRUE":
            return bool(field_value) is True
        if operator == "IS_FALSE":
            return bool(field_value) is False

    elif value_type == "LIST":
        list_name = condition.list_name
        allowed_values = config.get("lists", {}).get(list_name, set())

        if field_value is None:
            return False

        if isinstance(field_value, (list, set, tuple)):
            if operator in ("IN", "IN_LIST"):
                return any(str(v) in allowed_values for v in field_value)
            if operator in ("NOT_IN", "NOT_IN_LIST"):
                return all(str(v) not in allowed_values for v in field_value)
        else:
            if operator in ("IN", "IN_LIST"):
                return str(field_value) in allowed_values
            if operator in ("NOT_IN", "NOT_IN_LIST"):
                return str(field_value) not in allowed_values

    return False


def explain_condition(field_value, condition, config):
    operator = (condition.operator or "").upper()
    value_type = (condition.value_type or "").upper()

    if value_type == "STRING":
        compare_value = condition.string_value
    elif value_type == "NUMBER":
        compare_value = condition.numeric_value
    elif value_type == "BOOLEAN":
        compare_value = condition.boolean_value
    elif value_type == "LIST":
        compare_value = config.get("lists", {}).get(condition.list_name, set())
    else:
        compare_value = None

    return {
        "field_name": condition.field_name,
        "field_value": field_value,
        "operator": operator,
        "value_type": value_type,
        "compare_value": compare_value,
        "condition_group": condition.condition_group,
        "order_no": condition.order_no,
        "score": condition.score,
        "trigger_description": condition.trigger_description,
    }


def is_kyc_rule(rule) -> bool:
    return str(rule.rule_code).upper().startswith("KYC")


def evaluate_rule_against_target(target, rule, config, target_name=None):
    rule_trace = {
        "rule_code": rule.rule_code,
        "rule_name": rule.rule_name,
        "matched": False,
        "matched_group": None,
        "individual_name": target_name,
        "groups": [],
    }

    grouped_conditions = defaultdict(list)
    for condition in rule.conditions:
        grouped_conditions[condition.condition_group].append(condition)

    matched_group_conditions = None

    for group_no in sorted(grouped_conditions.keys(), key=lambda x: int(x)):
        conditions = sorted(
            grouped_conditions[group_no],
            key=lambda c: (c.order_no if c.order_no is not None else 999999)
        )

        group_trace = {
            "condition_group": group_no,
            "matched": True,
            "conditions": [],
        }

        for condition in conditions:
            field_value = get_field_value(target, condition.field_name)
            passed = evaluate_condition(field_value, condition, config)

            cond_trace = explain_condition(field_value, condition, config)
            cond_trace["passed"] = passed
            group_trace["conditions"].append(cond_trace)

            if not passed:
                group_trace["matched"] = False
                break

        rule_trace["groups"].append(group_trace)

        if group_trace["matched"]:
            matched_group_conditions = conditions
            rule_trace["matched"] = True
            rule_trace["matched_group"] = group_no
            break

    return matched_group_conditions, rule_trace


def evaluate_db_rules_with_trace(company, rules, config):
    total_score = 0
    triggers = []
    trace = []

    for rule in rules:
        print(f"\nEvaluating rule: {rule.rule_code} - {rule.rule_name}")

        if is_kyc_rule(rule):
            for individual in company.individuals:
                matched_group_conditions, rule_trace = evaluate_rule_against_target(
                    target=individual,
                    rule=rule,
                    config=config,
                    target_name=getattr(individual, "name", None),
                )

                trace.append(rule_trace)

                if matched_group_conditions:
                    first = matched_group_conditions[0]
                    total_score += first.score

                    base_desc = first.trigger_description or rule.description or rule.rule_name
                    name = getattr(individual, "name", "Unknown Individual")

                    triggers.append({
                        "code": rule.rule_code,
                        "description": f"{base_desc} ({name})"
                    })

        else:
            matched_group_conditions, rule_trace = evaluate_rule_against_target(
                target=company,
                rule=rule,
                config=config,
                target_name=None,
            )

            trace.append(rule_trace)

            if matched_group_conditions:
                first = matched_group_conditions[0]
                total_score += first.score

                triggers.append({
                    "code": rule.rule_code,
                    "description": first.trigger_description or rule.description or rule.rule_name,
                })

    return {
        "risk_score": total_score,
        "triggered_rules": triggers,
        "trace": trace,
    }