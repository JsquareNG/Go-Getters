def evaluate_rules(entity, rules):

    score = 0
    triggers = []

    for rule in rules:

        field_value = getattr(entity, rule["field"], None)

        if rule["operator"] == "equals":

            if field_value == rule["value"]:

                score += rule["score"]
                triggers.append(rule)

        elif rule["operator"] == "in":

            if field_value in rule["value"]:

                score += rule["score"]
                triggers.append(rule)

        elif rule["operator"] == "range":

            if rule["min"] <= field_value < rule["max"]:

                score += rule["score"]
                triggers.append(rule)

        elif rule["operator"] == "boolean":

            if field_value == rule["value"]:

                score += rule["score"]
                triggers.append(rule)

    return score, triggers