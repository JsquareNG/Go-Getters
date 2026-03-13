def calculate_range_score(value, table):

    for min_val, max_val, score in table:
        if min_val <= value < max_val:
            return score

    return 0