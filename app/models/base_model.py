from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class Classroom(BaseModel):
    classroom_id: Optional[str]

class Subject(BaseModel):
    classroom_id: Optional[Classroom] = None
    duration: float
    lecturer_id: str
    name: str
    subject_id: str
    level: str
    subject_availability: Optional[List[int]] = Field(default_factory=list)

class Scheduler(BaseModel):
    hours_per_day: int = 8 # 9 a.m. to 5 p.m.
    working_days: int = 5 # Monday to Friday
    operation_days: List[int] = []  # NEW: maps to real-world days (e.g., [1,3,4,5,6])
    time_slots: list = []
    lecturers_data: list = []

    days_map: Dict[int, str] = {
        1: "Monday",
        2: "Tuesday", 
        3:"Wednesday",
        4: "Thursday",
        5: "Friday",
    }
    reverse_day_map: Dict[str, int] = {v:k for k,v in days_map.items()}

    def slot_to_time(self, slot_index, slot_size=30, start=9):
        """
        Convert slot index -> HH:MM string.
        Example: slot_index=0 (9:00), slot_index=1 (9:30), ...
        """

        min = start * 60 + slot_index * slot_size
        h, m = divmod(min, 60)

        return f"{h:02d}:{m:02d}"

    def run(self, data):
        raise NotImplementedError("Scheduler interface is not implemented")


class Timetable(BaseModel):
    subjects: List[Subject] = Field(..., title="List of subjects")
    classrooms: List[Classroom] = Field(..., title="List of classrooms")
    model: Scheduler = Field(..., title="Scheduler technique")

    def generate(self):
        data = {
            "subjects": self.subjects,
            "classrooms": self.classrooms,
        }
        return self.model.run(data=data)