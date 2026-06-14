"""
CSP Timetable Scheduling Model
Implements constraint satisfaction problem solving for academic timetable generation
Handles dynamic days, working hours, classrooms, and batch constraints with break time allocation.
"""

from typing import List, Dict, Set, Tuple, Optional

# Days mapping (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri)
DAYS_MAP = {1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri"}
DAYS = ("Mon", "Tue", "Wed", "Thu", "Fri")

# DEFAULT CONSTANTS (will be overridden by frontend data)
START_HOUR, END_HOUR = 8, 17  # 8am to 5pm (END_HOUR is exclusive)
LUNCH_HOURS = (11, 12)  # Lunch break: 11:00-12:00 and 12:00-13:00

# Available classrooms (default)
classroom = ["001", "002"]

# All single-hour slots as (day, hour_start)
SLOTS = tuple((d, h) for d in DAYS for h in range(START_HOUR, END_HOUR))

# Constraints: per subject/lecturer code cannot be scheduled at certain days
constraints = {
    # Example: "CAL3023N": ["Mon", "Tue"],
    # Example: "Dr. A": ["Mon", "Tue"],
}


def parse_time(time_str):
    """
    Parse time string in format 'HHMM' to integer hour.
    Example: '0800' -> 8, '1700' -> 17
    """
    if isinstance(time_str, str):
        hour = int(time_str[:2])
        minute = int(time_str[2:4]) if len(time_str) >= 4 else 0
        return hour + (minute / 60)
    return time_str


def build_slots_from_operations(days, working_hours, start_hour=None, end_hour=None):
    """
    Build slots from operations data.

    Args:
        days: List of day numbers (1-5 for Mon-Fri)
        working_hours: String like "0800-1700"
        start_hour: Override start hour, if None parse from working_hours
        end_hour: Override end hour, if None parse from working_hours

    Returns:
        Tuple of slots: (day_name, hour)
    """
    # Parse working hours if not explicitly provided
    if start_hour is None or end_hour is None:
        parts = working_hours.split("-")
        start_hour = int(parse_time(parts[0]))
        end_hour = int(parse_time(parts[1]))

    day_names = [DAYS_MAP.get(d, "Mon") for d in days]
    slots = tuple((d, h) for d in day_names for h in range(start_hour, int(end_hour)))
    return slots, start_hour, int(end_hour)


def parse_lunch_break(lunch_break_str):
    """
    Parse lunch break string like '1200-1300' to (hour_start, hour_end).
    Example: '1200-1300' -> (12, 13)
    """
    parts = lunch_break_str.split("-")
    start = int(parse_time(parts[0]))
    end = int(parse_time(parts[1]))
    return (int(start), int(end))


def _extract_code(entry) -> str:
    """
    Extract subject code from various entry formats.
    Supports dict with 'subject_id' key, tuple (code, name, ...) or string "CODE Name"
    """
    if isinstance(entry, dict):
        return entry.get("subject_id", "").strip() if entry else ""
    if isinstance(entry, tuple):
        return entry[0].strip() if entry else ""
    if isinstance(entry, str):
        return entry.split()[0].strip() if entry else ""
    return ""


def build_students_from_batch(batch_list, scheduled_codes):
    """
    Build student groups from batch definitions.
    Ensures batches don't clash with mandatory break time allocation.

    Args:
        batch_list: List of batches, where each batch is a list of subject codes/dicts
        scheduled_codes: Set of subject codes that are actually scheduled

    Returns:
        List[Set[str]]: Per-student subject codes (filtered to scheduled codes)
    """
    students = []
    for _, items in enumerate(batch_list):
        codes = {
            _extract_code(item)
            for item in items
            if _extract_code(item) in scheduled_codes
        }
        if codes:  # Only add non-empty student groups
            students.append(codes)
    return students


def csp_schedule(
    subjects_list,
    operations=None,
    available_classrooms=None,
    slots=None,
    start_hour=None,
    end_hour=None,
    lunch_hours=None,
    students=None,
    constraints=None,
):
    """
    Constraint Satisfaction Problem solver using backtracking.
    Schedules subjects respecting:
    - Room availability and specified classroom assignments
    - Lecturer availability with lunch break
    - Student group conflicts (same batch students don't overlap)
    - Lunch break preservation (continuous break)
    - Day/time constraints and day-specific constraints
    - Subject duration (can be partial hours like 3.5)

    Args:
        subjects_list: List of dicts or tuples with subject info:
                      Dict: {'subject_id', 'name', 'lecturer_id', 'duration', 'classroom_id'(optional)}
                      Tuple: (code, name, duration, lecturer)
        operations: Dict with 'days', 'working_hours', 'lunch_break'
        available_classrooms: List of available classroom names
        slots: Prebuilt slots, or None to build from operations
        start_hour, end_hour: Override time boundaries
        lunch_hours: Tuple (start, end) for lunch break hours
        students: List of sets, where each set contains subject codes for a student group
        constraints: Dict mapping lecturer_name or subject_id to restricted day names
                    Example: {"Low Jing Xuan": ["Mon", "Fri"], "CS007": ["Mon", "Wed"]}

    Returns:
        List of assignments: (code, day, hour, room, duration)
    """
    # Parse operations if provided
    if operations:
        slots, start_hour, end_hour = build_slots_from_operations(
            operations.get("days", [1, 2, 3, 4, 5]),
            operations.get("working_hours", "0800-1700"),
            start_hour,
            end_hour,
        )
        if operations.get("lunch_break"):
            lunch_hours = parse_lunch_break(operations["lunch_break"])

    # Use defaults if not parsed
    if slots is None:
        slots = SLOTS
    if start_hour is None:
        start_hour = START_HOUR
    if end_hour is None:
        end_hour = END_HOUR
    if lunch_hours is None:
        lunch_hours = LUNCH_HOURS

    # Use provided constraints or default to empty dict
    if constraints is None:
        constraints = {}

    # Log incoming constraints
    if constraints:
        import sys

        print(f"DEBUG: CSP received constraints: {constraints}", file=sys.stderr)

    # Collect all required classrooms from subjects and merge with available
    required_classrooms = set()
    for entry in subjects_list:
        if isinstance(entry, dict) and entry.get("classroom_id"):
            required_classrooms.add(entry["classroom_id"])

    # Merge available classrooms with required ones
    all_classrooms = set(available_classrooms or [])
    all_classrooms.update(required_classrooms)
    rooms = list(all_classrooms) if all_classrooms else classroom

    used = set()  # Room occupancy: (day, hour, room)
    assignments = []

    # Student tracking
    student_used = set()  # (student_idx, day, hour)
    code_to_students = {}  # Map subject code to list of student indices

    # Lecturer tracking
    lecturer_used = set()  # (lecturer_name, day, hour)
    code_to_lecturer = {}  # Map subject code to lecturer name
    code_to_required_room = {}  # Map subject code to required room (if specified)

    # Build lookup tables from subjects
    for entry in subjects_list:
        code = _extract_code(entry)

        if isinstance(entry, dict):
            # Handle dict format from frontend
            code_to_lecturer[code] = entry.get("lecturer_id", "")
            if entry.get("classroom_id"):
                code_to_required_room[code] = entry["classroom_id"]
        elif isinstance(entry, tuple) and len(entry) >= 4:
            # Handle tuple format
            code_to_lecturer[code] = entry[3]

    if students:
        for idx, codes in enumerate(students):
            for code in codes:
                code_to_students.setdefault(code, []).append(idx)

    def get_subject_duration(entry):
        """Extract duration from subject entry."""
        if isinstance(entry, dict):
            dur = entry.get("duration", 1)
            return float(dur) if dur else 1
        elif isinstance(entry, tuple) and len(entry) > 2:
            dur = entry[2]
            return float(dur) if dur else 1
        return 1.0

    def violates_lunch(used_set, key, day, start_h, dur, lunch_start, lunch_end):
        """
        Check if scheduling violates lunch continuity.
        Ensures lunch hours remain free as a continuous block.
        """
        # Check if any lunch hour is already occupied
        for lunch_hour in range(lunch_start, lunch_end):
            if (key, day, lunch_hour) in used_set:
                return True

        # Check if proposed block overlaps with lunch hours
        for hour in range(int(start_h), int(start_h) + int(dur)):
            if lunch_start <= hour < lunch_end:
                return True

        return False

    def backtrack(subject_idx):
        """Backtracking recursive scheduler."""
        if subject_idx >= len(subjects_list):
            return True  # All subjects scheduled successfully

        entry = subjects_list[subject_idx]
        code = _extract_code(entry)
        duration = get_subject_duration(entry)
        lecturer = code_to_lecturer.get(code, "")
        students_for_code = code_to_students.get(code, [])
        required_room = code_to_required_room.get(code)

        # Determine rooms to try
        # Priority: required room first, then other available rooms
        if required_room:
            rooms_to_try = [required_room]
        else:
            rooms_to_try = rooms

        # Try all possible slots and rooms
        for day, hour in slots:
            # Skip if time block extends beyond END_HOUR
            if hour + duration > end_hour:
                continue

            # Check if subject is restricted on this day
            if constraints and code in constraints:
                if day in constraints.get(code, []):
                    # Subject has day restriction - skip this day
                    continue

            # Check if lecturer is restricted on this day
            if constraints and lecturer and lecturer in constraints:
                if day in constraints.get(lecturer, []):
                    # Lecturer has day restriction - skip this day
                    continue

            for room in rooms_to_try:
                # Check room availability for entire duration
                hour_range = [h for h in range(int(hour), int(hour + duration))]
                if any((day, h, room) in used for h in hour_range):
                    continue

                # Check student conflicts with break time allocation
                if students_for_code:
                    # Check if any student in this group has conflict
                    if any(
                        (stu, day, h) in student_used
                        for stu in students_for_code
                        for h in hour_range
                    ):
                        continue

                    # Check lunch break for all students
                    if any(
                        violates_lunch(
                            student_used,
                            stu,
                            day,
                            hour,
                            duration,
                            lunch_hours[0],
                            lunch_hours[1],
                        )
                        for stu in students_for_code
                    ):
                        continue

                # Check lecturer availability
                if lecturer:
                    if any((lecturer, day, h) in lecturer_used for h in hour_range):
                        continue

                    # Check lunch break for lecturer
                    if violates_lunch(
                        lecturer_used,
                        lecturer,
                        day,
                        hour,
                        duration,
                        lunch_hours[0],
                        lunch_hours[1],
                    ):
                        continue

                # Schedule this subject at this slot
                for h in hour_range:
                    used.add((day, h, room))

                for stu in students_for_code:
                    for h in hour_range:
                        student_used.add((stu, day, h))

                if lecturer:
                    for h in hour_range:
                        lecturer_used.add((lecturer, day, h))

                assignments.append((code, day, hour, room, duration))

                # Recursively schedule remaining subjects
                if backtrack(subject_idx + 1):
                    return True

                # Backtrack: undo scheduling
                for h in hour_range:
                    used.discard((day, h, room))

                for stu in students_for_code:
                    for h in hour_range:
                        student_used.discard((stu, day, h))

                if lecturer:
                    for h in hour_range:
                        lecturer_used.discard((lecturer, day, h))

                assignments.pop()

        return False  # No valid schedule found for this subject

    # Run backtracking
    success = backtrack(0)

    # Return assignments if all subjects were scheduled
    return assignments if success and len(assignments) == len(subjects_list) else []


def build_timetable_view(assignments, subjects_list, start_hour=None, end_hour=None):
    """
    Build an HTML-friendly timetable view from assignments.
    Creates a grid with 30-minute time slots.

    Args:
        assignments: List of (code, day, hour, room, duration) tuples
        subjects_list: List of dicts or tuples with subject info
        start_hour: Start hour (default 8)
        end_hour: End hour (default 17)

    Returns:
        Dict with timetable structure for rendering
    """
    if start_hour is None:
        start_hour = START_HOUR
    if end_hour is None:
        end_hour = END_HOUR

    # Build lookup tables
    subject_names = {}
    subject_lecturers = {}

    for entry in subjects_list:
        code = _extract_code(entry)

        if isinstance(entry, dict):
            subject_names[code] = entry.get("name", "")
            subject_lecturers[code] = entry.get("lecturer_id", "")
        elif isinstance(entry, tuple):
            if len(entry) >= 2:
                subject_names[code] = entry[1]
            if len(entry) >= 4:
                subject_lecturers[code] = entry[3]

    # Calculate grid dimensions (30-minute slots)
    num_cols = (end_hour - start_hour) * 2
    time_labels = []
    for hour in range(start_hour, end_hour):
        time_labels.append(f"{hour:02d}:00-{hour:02d}:30")
        time_labels.append(f"{hour:02d}:30-{hour + 1:02d}:00")

    # Map assignments to grid
    event_map = {}
    for code, day, hour, room, duration in assignments:
        start_col = int((hour - start_hour) * 2)
        colspan = int(duration * 2)
        # Use string key instead of tuple (JSON serialization requirement)
        key = f"{day}_{room}_{start_col}"
        event_map[key] = {
            "code": code,
            "name": subject_names.get(code, ""),
            "lecturer": subject_lecturers.get(code, ""),
            "room": room,
            "colspan": colspan,
        }

    return {
        "time_labels": time_labels,
        "days": DAYS,
        "event_map": event_map,
        "num_cols": num_cols,
    }
