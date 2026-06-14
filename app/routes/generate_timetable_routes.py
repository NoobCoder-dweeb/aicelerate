from flask import Blueprint, render_template, request, jsonify, Response
from flask_login import login_required, current_user
from .. import db
from typing import Union
from ..models.model import (
    csp_schedule,
    build_students_from_batch,
)
from ..utils.logger import logger

generate_timetable_bp = Blueprint("generate_timetable_bp", __name__)
JSONResponse = Union[Response, tuple[Response, int]]


def calculate_hours_per_day(working_hours: str, lunch_break: str) -> int:
    """
    Calculate effective hours per day by parsing working_hours and subtracting lunch_break.
    Assumes 24-hour format (HHMM) and lunch break within working hours.
    """
    try:
        # Parse working hours (e.g., "0900-1800" -> start=9, end=18)
        start_str, end_str = working_hours.split("-")
        start_hour = int(start_str[:2])  # Extract hour from HHMM
        end_hour = int(end_str[:2])
        total_hours = end_hour - start_hour

        # Parse lunch break (e.g., "1200-1300" -> start=12, end=13)
        lunch_start_str, lunch_end_str = lunch_break.split("-")
        lunch_start_hour = int(lunch_start_str[:2])
        lunch_end_hour = int(lunch_end_str[:2])
        lunch_hours = lunch_end_hour - lunch_start_hour

        # Effective hours = total - lunch
        effective_hours = total_hours - lunch_hours
        return max(effective_hours, 0)  # Ensure non-negative
    except (ValueError, IndexError):
        # Fallback if parsing fails
        return 8


@generate_timetable_bp.route("/generate-timetable")
@login_required
def generate_timetable():
    username = current_user.id
    # Get selected programs from URL query params
    selected_programs = request.args.getlist("programs")

    # Fetch tagging_subject
    tagging_subjects = []
    tagging_subjects_ref = (
        db.collection("users").document(username).collection("tagging_subject")
    )
    for doc in tagging_subjects_ref.stream():
        subj = doc.to_dict()
        subj["id"] = doc.id
        tagging_subjects.append(subj)

    # Fetch tagging_department
    tagging_departments = []
    tagging_departments_ref = (
        db.collection("users").document(username).collection("tagging_department")
    )
    for doc in tagging_departments_ref.stream():
        tag = doc.to_dict()
        tag["id"] = doc.id
        tagging_departments.append(tag)

    # Fetch tagging_programme
    tagging_programmes = []
    tagging_programmes_ref = (
        db.collection("users").document(username).collection("tagging_programme")
    )
    for doc in tagging_programmes_ref.stream():
        prog = doc.to_dict()
        prog["id"] = doc.id
        tagging_programmes.append(prog)

    # Fetch subjects
    subjects = []
    subjects_ref = db.collection("users").document(username).collection("subjects")
    for doc in subjects_ref.stream():
        subject = doc.to_dict()
        subject["id"] = doc.id
        subjects.append(subject)

    # Fetch classrooms
    classrooms = []
    classrooms_ref = db.collection("users").document(username).collection("classrooms")
    for doc in classrooms_ref.stream():
        classroom = doc.to_dict()
        classroom["id"] = doc.id
        classrooms.append(classroom)

    # Fetch lecturers
    lecturers = []
    lecturers_ref = db.collection("users").document(username).collection("lecturers")
    for doc in lecturers_ref.stream():
        lecturer = doc.to_dict()
        lecturer["id"] = doc.id
        lecturers.append(lecturer)

    return render_template(
        "generate_timetable.html",
        subjects=subjects,
        classrooms=classrooms,
        tagging_departments=tagging_departments,
        tagging_programmes=tagging_programmes,
        tagging_subjects=tagging_subjects,
        selected_programs=selected_programs,
        lecturers=lecturers,
    )


@generate_timetable_bp.route("/generate", methods=["POST"])
@login_required
def generate_timetable_data():
    try:
        username = current_user.id
        data = request.get_json()

        # Extract operations (days, working_hours, lunch_break)
        operations = data.get("operations", {})
        working_days = operations.get("days", [1, 2, 3, 4, 5])
        working_hours = operations.get("working_hours", "0800-1700")
        lunch_break = operations.get("lunch_break", "1200-1300")

        # Extract available classrooms from frontend
        available_classrooms = data.get("classrooms", [])
        if not available_classrooms:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "No classrooms selected. Please select at least one classroom.",
                    }
                ),
                400,
            )

        # Get selected subjects (already in dict format from frontend)
        subjects_data = data.get("subjects", [])
        if not subjects_data:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "No subjects selected. Please select at least one subject.",
                    }
                ),
                400,
            )

        # Subjects are already in dict format - use directly
        subjects_list = subjects_data

        logger.info(f"Starting timetable generation for {len(subjects_list)} subjects")
        logger.info(
            f"Days: {working_days}, Hours: {working_hours}, Lunch: {lunch_break}"
        )
        logger.info(f"Available classrooms: {available_classrooms}")

        # Fetch batches for the current user
        batches_list = []
        batches_info = {}  # Store batch name -> subject codes mapping for frontend
        try:
            batches_ref = (
                db.collection("users").document(username).collection("batches")
            )
            for doc in batches_ref.stream():
                batch = doc.to_dict()
                if batch and "subjects" in batch:
                    # Extract subject codes from batch subjects
                    batch_subject_codes = []
                    for subj in batch["subjects"]:
                        if isinstance(subj, dict):
                            code = subj.get("subject_id", subj.get("code", ""))
                        else:
                            code = str(subj)
                        if code:
                            batch_subject_codes.append(code)

                    if batch_subject_codes:
                        batches_list.append(batch_subject_codes)
                        # Store batch name and subject codes for frontend
                        batch_name = batch.get("name", doc.id)
                        batches_info[batch_name] = batch_subject_codes

            logger.info(f"Loaded {len(batches_list)} batches for user {username}")
        except Exception as e:
            logger.warning(
                f"Could not load batches: {str(e)}. Proceeding without batch constraints."
            )
            batches_list = []
            batches_info = {}

        # Build students from batches
        scheduled_codes = {
            s.get("subject_id", s.get("code", "")) if isinstance(s, dict) else str(s)
            for s in subjects_list
        }
        scheduled_codes.discard("")  # Remove empty codes

        if batches_list:
            students = build_students_from_batch(batches_list, scheduled_codes)
            logger.info(f"Created {len(students)} student groups from batches")
        else:
            # If no batches, each subject is independent
            students = None
            logger.info(
                "No batches defined. Generating schedule without student group constraints."
            )

        # Extract constraints from frontend data
        # Build constraints dict: {lecturer_name or subject_id: [restricted_day_names]}
        constraints_dict = {}

        # Extract lecturer availability constraints
        lecturers_data = data.get("lecturers", [])
        day_num_to_name = {1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri"}

        logger.info(
            f"Processing {len(lecturers_data)} lecturer constraints from frontend"
        )

        for lecturer in lecturers_data:
            lecturer_name = lecturer.get("lecturer_name", "")
            available_days = lecturer.get("lecturer_availability", [1, 2, 3, 4, 5])

            logger.info(
                f"Lecturer constraint - Name: '{lecturer_name}', Available days: {available_days}"
            )

            if lecturer_name and available_days:
                # Convert available days to restricted days
                all_days = [1, 2, 3, 4, 5]
                restricted_days = [d for d in all_days if d not in available_days]

                if restricted_days:
                    # Convert day numbers to day names
                    restricted_day_names = [
                        day_num_to_name.get(d, "") for d in restricted_days
                    ]
                    restricted_day_names = [
                        d for d in restricted_day_names if d
                    ]  # Remove empty strings
                    constraints_dict[lecturer_name] = restricted_day_names
                    logger.info(
                        f"✓ Added lecturer constraint: {lecturer_name} → {restricted_day_names}"
                    )

        # Extract subject availability constraints
        logger.info(
            f"Processing subject constraints from {len(subjects_list)} subjects"
        )

        import json

        if subjects_list:
            logger.info(
                f"First subject full data: {json.dumps(subjects_list[0], default=str, indent=2)}"
            )

        for idx, subject in enumerate(subjects_list):
            subject_id = subject.get("subject_id", "")
            available_days = subject.get("subject_availability")

            # Log what we found
            if subject_id:
                has_availability = "subject_availability" in subject
                logger.info(
                    f"Subject #{idx} - ID: '{subject_id}', Has availability field: {has_availability}, Value: {available_days}"
                )

            if subject_id and available_days:
                # Convert available days to restricted days
                all_days = [1, 2, 3, 4, 5]
                restricted_days = [d for d in all_days if d not in available_days]

                if restricted_days:
                    # Convert day numbers to day names
                    restricted_day_names = [
                        day_num_to_name.get(d, "") for d in restricted_days
                    ]
                    restricted_day_names = [
                        d for d in restricted_day_names if d
                    ]  # Remove empty strings
                    constraints_dict[subject_id] = restricted_day_names
                    logger.info(
                        f"✓ Added subject constraint: {subject_id} → {restricted_day_names}"
                    )

        logger.info(f"Final constraints dict: {constraints_dict}")

        # Run CSP scheduler with dynamic operations and classrooms
        logger.info(
            f"Starting CSP scheduler with {len(subjects_list)} subjects and {len(constraints_dict)} constraints"
        )
        assignments = csp_schedule(
            subjects_list=subjects_list,
            operations=operations,
            available_classrooms=available_classrooms,
            students=students,
            constraints=constraints_dict,
        )

        if not assignments:
            logger.warning("CSP scheduler could not find valid schedule")
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Could not generate timetable with the given constraints. Try relaxing some constraints or adjusting the schedule parameters.",
                    }
                ),
                400,
            )

        # Transform assignments into frontend-expected format
        # Format: { subject_id: { day, start, end, classroom_id, lecturer_id, level } }
        timetable_data = {}
        day_map = {
            1: "Monday",
            2: "Tuesday",
            3: "Wednesday",
            4: "Thursday",
            5: "Friday",
        }
        day_short_map = {
            "Mon": "Monday",
            "Tue": "Tuesday",
            "Wed": "Wednesday",
            "Thu": "Thursday",
            "Fri": "Friday",
        }

        # Build lookup for subject info
        subject_info = {}
        for subj in subjects_list:
            code = subj.get("subject_id") or subj.get("code", "")
            subject_info[code] = {
                "name": subj.get("name", ""),
                "lecturer_id": subj.get("lecturer_id", ""),
                "level": subj.get("level", ""),
                "duration": subj.get("duration", 1),
            }

        # Convert assignments to frontend format
        for code, day_short, start_hour, room, duration in assignments:
            # Convert short day name to full day name
            day_full = day_short_map.get(day_short, day_short)

            # Convert hour to time format HH:MM
            start_h = int(start_hour)
            start_m = int((start_hour % 1) * 60)
            end_h = int(start_hour + duration)
            end_m = int(((start_hour + duration) % 1) * 60)

            start_time = f"{start_h:02d}:{start_m:02d}"
            end_time = f"{end_h:02d}:{end_m:02d}"

            subject_data = subject_info.get(code, {})

            timetable_data[code] = {
                "day": day_full,
                "start": start_time,
                "end": end_time,
                "classroom_id": room,
                "lecturer_id": subject_data.get("lecturer_id", ""),
                "subject_name": subject_data.get("name", code),
                "level": subject_data.get("level", ""),
                "duration": duration,
            }

        logger.info(
            f"Timetable generated successfully with {len(assignments)} scheduled sessions"
        )

        response_data = {
            "success": True,
            "message": "Timetable generated successfully",
            "received_data": timetable_data,
            "assignments": assignments,
            "batches": batches_info,  # Include batch info for frontend sidebar
            "stats": {
                "total_subjects": len(subjects_list),
                "total_sessions": len(assignments),
                "batches_used": len(batches_list),
                "classrooms_used": list(
                    set(a[3] for a in assignments)
                ),  # Unique classrooms from assignments
            },
        }

        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Error generating timetable: {str(e)}", exc_info=True)
        return (
            jsonify(
                {"success": False, "message": f"Error generating timetable: {str(e)}"}
            ),
            500,
        )
