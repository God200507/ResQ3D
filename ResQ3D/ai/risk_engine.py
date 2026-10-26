"""ResQ3D AI-style emergency risk engine.

This is a transparent rule-based inference engine for the academic MVP.
It uses gas level, temperature, combined sensor evidence and recent trend data.
It is intentionally dependency-free so it runs offline.
"""

ROOM_WEIGHTS = {
    'lab': 8,
    'computer': 6,
    'electronics': 8,
    'iot': 8,
    'research': 7,
    'project': 6,
    'seminar': 3,
    'classroom': 2,
    'faculty': 2,
    'office': 1,
    'storage': 4,
}


def room_factor(room):
    name = str(room or '').lower()
    for key, value in ROOM_WEIGHTS.items():
        if key in name:
            return value
    return 2


def clamp(value, low=0, high=100):
    return max(low, min(high, value))


def analyze(current, history=None):
    history = history if isinstance(history, list) else []

    gas = float(current.get('gas_value', 0) or 0)
    temp = float(current.get('temperature', 0) or 0)
    floor = int(current.get('floor', 1) or 1)
    room = current.get('room', 'Unknown')

    # Gas contribution: 200 is warning threshold, 400+ is severe.
    gas_score = clamp((gas / 400.0) * 55.0)

    # Temperature contribution: 25C baseline, 80C severe.
    temp_score = clamp(((temp - 25.0) / 55.0) * 45.0)

    combined_bonus = 20 if gas >= 200 and temp >= 50 else 0
    room_bonus = room_factor(room)

    # Trend: compare with the previous three readings when available.
    previous = history[1:4] if len(history) > 1 else []
    trend_bonus = 0
    if previous:
        prev_gas = sum(float(x.get('gas_value', 0) or 0) for x in previous) / len(previous)
        prev_temp = sum(float(x.get('temperature', 0) or 0) for x in previous) / len(previous)
        if gas > prev_gas + 25:
            trend_bonus += 6
        if temp > prev_temp + 5:
            trend_bonus += 6

    raw_score = gas_score + temp_score + combined_bonus + room_bonus + trend_bonus
    score = int(round(clamp(raw_score)))

    if score >= 75:
        level = 'CRITICAL'
    elif score >= 50:
        level = 'HIGH'
    elif score >= 25:
        level = 'MEDIUM'
    else:
        level = 'LOW'

    recommendations = []

    if gas >= 200:
        recommendations.append('Investigate smoke/gas source immediately.')
    if temp >= 50:
        recommendations.append('Treat the area as a heat-risk zone.')
    if gas >= 200 and temp >= 50:
        recommendations.append('Start emergency evacuation and use the safest staircase.')
    elif score >= 50:
        recommendations.append('Restrict access to the affected room and prepare evacuation.')
    elif score >= 25:
        recommendations.append('Monitor the sensor closely and verify the area.')
    else:
        recommendations.append('Continue normal monitoring.')

    if floor > 1 and score >= 50:
        recommendations.append('Prioritize downward evacuation toward the ground exit.')

    return {
        'score': score,
        'level': level,
        'gas_score': round(gas_score, 1),
        'temperature_score': round(temp_score, 1),
        'combined_bonus': combined_bonus,
        'room_bonus': room_bonus,
        'trend_bonus': trend_bonus,
        'floor': floor,
        'room': room,
        'gas_value': gas,
        'temperature': temp,
        'recommendations': recommendations,
        'engine': 'ResQ3D AI Risk Engine v1 (rule-based inference)',
    }
