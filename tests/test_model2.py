import pytest
from datetime import datetime
from app.models.csp import CSPSchedulerORSATv2  # Ensure this import works after fixing app/__init__.py
from app.models.base_model import Timetable, Classroom, Subject
import json
import os

def calculate_hours_per_day(working_hours: str, lunch_break: str) -> int:
    """
    Calculate effective hours per day by parsing working_hours and subtracting lunch_break.
    Assumes 24-hour format (HHMM) and lunch break within working hours.
    """
    try:
        # Parse working hours (e.g., "0900-1800" -> start=9, end=18)
        start_str, end_str = working_hours.split('-')
        start_hour = int(start_str[:2])  # Extract hour from HHMM
        end_hour = int(end_str[:2])
        total_hours = end_hour - start_hour
        
        # Parse lunch break (e.g., "1200-1300" -> start=12, end=13)
        lunch_start_str, lunch_end_str = lunch_break.split('-')
        lunch_start_hour = int(lunch_start_str[:2])
        lunch_end_hour = int(lunch_end_str[:2])
        lunch_hours = lunch_end_hour - lunch_start_hour
        
        # Effective hours = total - lunch
        effective_hours = total_hours - lunch_hours
        return max(effective_hours, 0)  # Ensure non-negative
    except (ValueError, IndexError):
        # Fallback if parsing fails
        return 8

def parse_time(t: str) -> datetime:
    """Convert 'HH:MM' → datetime for comparison."""
    return datetime.strptime(t, "%H:%M")

def overlaps(a_start, a_end, b_start, b_end) -> bool:
    """Return True if two time intervals overlap."""
    return a_start < b_end and b_start < a_end

@pytest.fixture
def sample_schedule():
    """Example schedule returned by your CSP/CP-SAT scheduler."""
    # Load data from JSON files with error handling
    test_data_path = "tests/test_data2.json"
    output_data_path = "tests/output2.json"
    
    if os.path.exists(output_data_path):
        with open(output_data_path, 'r') as f:
            data = json.load(f)
    elif os.path.exists(test_data_path):
        with open(test_data_path, 'r') as f:
            data = json.load(f)
    else:
        pytest.fail("Neither 'tests/test_data.json' nor 'tests/output.json' found. Please provide test data.")

    operations = data.get("operations", {})

    working_days = operations.get("days", [])
    days_per_week = len(working_days)
    working_hours = operations.get("working_hours", "0900-1800")  # Default if missing
    lunch_break = operations.get("lunch_break", "1200-1300")     # Default if missing
    hours_per_day = calculate_hours_per_day(working_hours, lunch_break)

    # Get classrooms and subject information
    classrooms = list(data.get("classrooms", []))
    available_classrooms = [Classroom(classroom_id=c_id) for c_id in classrooms]
    
    subjects_data = data.get("subjects", [])
    subjects = []

    for subject in subjects_data:
        classroom_id = subject.get("classroom_id")
        classroom = Classroom(classroom_id=classroom_id) if classroom_id else None
        
        lecturer_name = subject.get("lecturer_id")
        subject_availability = subject.get("subject_availability", working_days)
        
        subj = Subject(
            classroom_id=classroom,
            duration=subject.get("duration"),
            lecturer_id=lecturer_name,
            name=subject.get("name"),
            subject_id=subject.get("subject_id"),
            level=subject.get("level"),
            subject_availability=subject_availability,
        )
        subjects.append(subj)

    TIMETABLE_CONFIG = {
        "subjects" : subjects,
        "classrooms": available_classrooms,
        # "model" : CSPScheduler(working_days=5, hours_per_day=8)
        # "model" : CSPSchedulerORSAT(working_days=5, hours_per_day=8)
        "model" : CSPSchedulerORSATv2(
            working_days=days_per_week, 
            hours_per_day=hours_per_day,
            operation_days=working_days,
            lecturers_data=data.get("lecturers", []),
        )
    }

    timetable = Timetable(**TIMETABLE_CONFIG)
    results = timetable.generate()
    print(results)
    
    if not results:
        pytest.fail("Timetable generation failed or returned no results.")
    
    return results

def test_no_classroom_clashes(sample_schedule):
    """Ensure no two subjects share the same classroom at overlapping times."""
    schedule = sample_schedule
    items = list(schedule.items())

    for i in range(len(items)):
        id1, s1 = items[i]
        for j in range(i + 1, len(items)):
            id2, s2 = items[j]
            # Same day and classroom
            if s1["day"] == s2["day"] and s1["classroom_id"] == s2["classroom_id"]:
                t1_start, t1_end = parse_time(s1["start"]), parse_time(s1["end"])
                t2_start, t2_end = parse_time(s2["start"]), parse_time(s2["end"])
                assert not overlaps(t1_start, t1_end, t2_start, t2_end), \
                    f"❌ Classroom clash between {id1} and {id2} on {s1['day']} in {s1['classroom_id']}"

def test_no_lecturer_clashes(sample_schedule):
    """Ensure no lecturer is teaching overlapping subjects."""
    schedule = sample_schedule
    items = list(schedule.items())

    for i in range(len(items)):
        id1, s1 = items[i]
        for j in range(i + 1, len(items)):
            id2, s2 = items[j]
            # Same day and lecturer
            if s1["day"] == s2["day"] and s1["lecturer_id"] == s2["lecturer_id"]:
                t1_start, t1_end = parse_time(s1["start"]), parse_time(s1["end"])
                t2_start, t2_end = parse_time(s2["start"]), parse_time(s2["end"])
                assert not overlaps(t1_start, t1_end, t2_start, t2_end), \
                    f"❌ Lecturer clash between {id1} and {id2} ({s1['lecturer_id']}) on {s1['day']}"
