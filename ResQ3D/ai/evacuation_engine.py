from math import sqrt

STAIRS = {
    'STAIR_A': {'name': 'Stair A', 'side': 'WEST', 'x': -15.5, 'capacity': 40},
    'STAIR_B': {'name': 'Stair B', 'side': 'EAST', 'x': 15.5, 'capacity': 40},
}


def _distance_score(fire_x, stair_x):
    distance = abs(float(fire_x) - stair_x)
    return min(100.0, distance / 33.0 * 100.0)


def recommend(fire_floor, fire_x, risk_level='LOW', affected_rooms=1, people_at_risk=10):
    fire_floor = int(fire_floor)
    fire_x = float(fire_x)
    affected_rooms = int(affected_rooms)
    people_at_risk = int(people_at_risk)

    candidates = []
    for stair_id, stair in STAIRS.items():
        distance = abs(fire_x - stair['x'])
        distance_score = _distance_score(fire_x, stair['x'])

        # Opposite-side preference: if the incident is on the west side,
        # prefer the east stair, and vice versa.
        opposite_bonus = 28 if (fire_x < 0 and stair_id == 'STAIR_B') or (fire_x >= 0 and stair_id == 'STAIR_A') else 0

        # Higher floors slightly increase the value of a shorter route.
        floor_penalty = fire_floor * 2.5
        crowd_penalty = max(0, people_at_risk - stair['capacity']) * 1.5
        affected_penalty = max(0, affected_rooms - 3) * 2.0

        score = distance_score + floor_penalty + crowd_penalty + affected_penalty - opposite_bonus

        candidates.append({
            'id': stair_id,
            'name': stair['name'],
            'side': stair['side'],
            'distance_units': round(distance, 2),
            'score': round(score, 2),
        })

    candidates.sort(key=lambda x: x['score'])
    selected = candidates[0]

    level = str(risk_level).upper()
    recommendations = [
        f"Use {selected['name']} as the primary evacuation staircase.",
        "Keep the route from the incident room to the corridor clear.",
        "Avoid the staircase nearest the fire when an opposite-side route is available.",
    ]

    if level in ('HIGH', 'CRITICAL'):
        recommendations.insert(0, 'Immediate evacuation recommended; do not enter the affected room.')

    if people_at_risk > 40:
        recommendations.append('High occupant load: direct people toward both exits if the secondary route is confirmed safe.')

    return {
        'fire_floor': fire_floor,
        'fire_x': fire_x,
        'risk_level': level,
        'selected_stair': selected['id'],
        'selected_stair_name': selected['name'],
        'reason': 'Lowest evacuation score after distance, floor, crowd, affected-area, and opposite-side safety factors.',
        'candidates': candidates,
        'recommendations': recommendations,
    }
