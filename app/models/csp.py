from .base_model import Scheduler, Classroom, Subject
from app.utils.logger import logger
from constraint import RecursiveBacktrackingSolver, Problem
from ortools.sat.python import cp_model
from typing import Any, List, Tuple, Dict, Set, Optional
import random
from collections import defaultdict
from functools import partial

class MRV_LCVSolver(RecursiveBacktrackingSolver):
    """
    Implements a Minimum Remaining Values heuristic.
    Purpose: Scales above 30 domains
    """

    # MRV
    def selectVariable(self, variables, domains, assignments):
        """
        Function that implements the Minimum Remaining Values.
        """
        # choose the constraints with smallest available domains
        min_size = min(len(domains[v]) for v in variables)
        # collect all variables within that size
        candidates = [v for v in variables if len(domains[v]) == min_size]

        # return pre-maturely if there is only one solution
        if len(candidates) == 1:
            return candidates[0]
        
        # caching
        degree_cache = {}
        for v in candidates:
            count = 0
            for other in variables:
                if other ==v:
                    continue
                if set(domains[v]) & set(domains[other]):
                    count += 1
            degree_cache[v] = count
            

        # degree heuristic: variable invoved in most constraints
        # def degree(var):
        #     count = 0
        #     for other in variables:
        #         if other == var:
        #             continue
        #         if set(domains[var]) & set(domains[other]):
        #             count += 1
        #     return count
        
        # max_degree = max(degree(v) for v in candidates)
        # best_vars = [v for v in candidates if degree(v) == max_degree]

        max_degree = max(degree_cache.values())
        best_vars = [v for v in candidates if degree_cache[v] == max_degree]
        # return random.choice(best_vars) # tie-breaker
        return sorted(best_vars)[0]
        

    
    def orderValues(self, variable, domains, assignments, forwardcheck=False):
        """
        Function that implements the approximate Least Constraining Values algorithm.
        - Prefer earlier times
        - Prefer spread across classrooms
        - Break ties randomly
        - Prefer values that leave options for neighbours
        """
        # sort values by how few domains they cut off in neighbours
        values = list(domains[variable])
        neighbours = [v for v in domains if v != variable and v not in assignments]

        # def lcv_key(val):
        #     day, start, room = val
        #     return day, start, room
        
        # def lcv_score(val):
        #     score = 0
        #     for neighbour in domains:
        #         if neighbour == variable or neighbour in assignments:
        #             continue

        #         # count available neighbour values
        #         compatible = sum(
        #             1 for neighbour_val in domains[neighbour]
        #             if neighbour_val != val # avoid clashes
        #         )
        #         score += compatible
            
        #     return score
        def lcv_score(val):
            score = 0
            for neighbour in neighbours:
                compatible = sum(1 for neighbour_val in domains[neighbour] if neighbour_val != val)
                score += compatible
            return score
        
        # values.sort(key=lcv_key)
        # random.shuffle(values) # randomise ties
        # values.sort(key=lcv_score, reverse=True) # Higher the better
        values.sort(key=lambda v: (lcv_score(v), v[0], v[1]), reverse=True) # Higher the better
        return values

class CSPScheduler(Scheduler):
    """
    Model that inherits from Scheduler class and implements the CSP algorithm

    Args:
        hours_per_day: int = Number of working hours/day, e.g. 8 (default) 
        working_days: int = Number of working days/week, e.g. 5 (default)
        time_slots: list = List of 30-minute time slots (default = [])
        days_map: Dict[int, str] = Dictionary mapping day of week to corresponding title. Default, {
            1: "Monday",
            2: "Tuesday", 
            3:"Wednesday",
            4: "Thursday",
            5: "Friday",
        }
        reverse_day_map: Dict[str, int] = Converts day name to day of week.
    """

    solver : Any = None
    problem: Any = None
    
    # def parse(self, subjects: List[Subject]) -> List[dict]:
    #     """
    #     Returns a list of subject dictionaries.

    #     Args:
    #         subjects: List[Subject] = List of subjects.
        
    #     Return:
    #         List[dict] = List of subject dictionaries.
    #     """
    #     def format(subject: Subject):
    #         sub = subject.model_dump()
    #         sub["classroom_id"] = sub["classroom_id"]["classroom_id"]
    #         return sub
        
    #     return[format(subject) for subject in subjects]
    def parse(self, subjects: List[Subject]) -> List[dict]:
        """
        Returns a list of subject dictionaries.

        Args:
            subjects: List[Subject] = List of subjects.
        
        Return:
            List[dict] = List of subject dictionaries.
        """
        def format(subject):
            sub = subject.model_dump()  # Convert Pydantic model to dict
            if sub["classroom_id"] and isinstance(sub["classroom_id"], dict):
                sub["classroom_id"] = sub["classroom_id"]["classroom_id"]
            return sub
        return [format(subject) for subject in subjects]  # Fixed syntax: added space after 'return'


    def run(self, data: Dict[str, List[Any]]) -> Optional[dict]:
        """
        Runs the CSP Scheduler

        :params: data: Dict[str, List[Any]] = Dictionary containing subjects and available classrooms
        :returns Optional[dict]: Dictionary or None containing 
        """
        logger.info("CSP Model is running")
        result = None

        # setup the CSP solver
        self.solver = MRV_LCVSolver(forwardcheck=True)
        self.problem = Problem(solver=self.solver)

        self.time_slots =  [
            (day, slot) 
            for day in range(1, self.working_days+1)
            for slot in range(int(self.hours_per_day * 2))
        ] # Create 30-min time slots

        # get the data
        classrooms = data.get("classrooms") or []
        subjects = data.get("subjects") or []

        # sanity checks
        if not subjects:
            logger.warning("No subjects provided")
            return result
        if not classrooms:
            logger.warning("No classrooms provided")
            return result

        try:
            # create domain and add constraints
            self._create_domains(subjects=subjects, classrooms=classrooms)
            self._add_constraints(subjects=subjects)

            # get solution
            solution = self.problem.getSolution()

            if not solution:
                logger.info("No feasible solution is found")
                return result

            # generate a result dictionary with subject_id-info pairs
            result = {key: {} for key in solution.keys()}

            subjects_as_dict: list = self.parse(subjects=subjects)        

            subjects_lookup = {s["subject_id"]: s for s in subjects_as_dict}
            logger.info("Converted subjects to lookup table")
            
            for subject_id, values in solution.items():
                # ensure that the subject exists
                if subject_id not in subjects_lookup.keys():
                    continue
                
                # find the subject by id
                sub = subjects_lookup[subject_id]
                (day, start, room) = values
                duration: float = float(sub["duration"])

                info = {
                    "name": sub.get("name", ""),
                    "classroom_id": room,
                    "day" : self.days_map.get(day, f"Day-{day}"),
                    "start" : f"{self.slot_to_time(start)}",
                    "end" : f"{self.slot_to_time(start + int(duration * 2))}",
                    "lecturer_id" : sub["lecturer_id"],
                    "duration": duration,
                    "level": sub.get("level", ""),
                }

                # append the subject information to the dictionary
                result[subject_id] = info
            
            # sort in ascending day and start time
            result = dict(
                sorted(result.items(), 
                       key=lambda x: (self.reverse_day_map[x[1]["day"]], x[1]["start"]))
            )

            logger.info(f"Computed results")
        except Exception as e:
            logger.error(e)
        
        return result


    def _no_time_collision_chk(self, 
                           assignment: Tuple[int, int, str], 
                           duration: float=1.) -> bool:
        """
        Ensures that schedule does not land at 12.00 p.m. to 12.30 p.m.

        :param: assignment: Tuple[int, int, str] = Combination of day, slot and class 
        :param: duration: float = subject duration 
        
        :returns bool:
        """
        _, start, _ = assignment
        slots_needed = int(duration * 2)
        occupied: Set = set(range(start, start+slots_needed))

        lunch_start: int = (12-9) * 2 # slot index for 12.00 p.m.
        lunch_slots: Set[int] = {lunch_start, lunch_start+1}

        return occupied.isdisjoint(lunch_slots)

    def _no_overlap_group_chk(self, *assignments, group) -> bool:
        """
        Ensure no overlapping among a group of subjects
        (all taught by same lecturer or in same classroom).
        """
        used = []

        # for (assignment, subject) in zip(assignments, group):
        #     day, start, _ = assignment
        #     duration = int(subject.duration * 2)
        #     end = start + duration

        #     for (d, s, e) in used:
        #         if d == day and not (end <= s or e <= start):
        #             return False
        #     used.append((day, start, end))

        for (assignment, subject) in zip(assignments, group):
            day, start, _ = assignment
            duration = int(subject.duration * 2)
            used.append((day, start, start + duration))

        # sort by day then start time
        used.sort()

        for i in range(1, len(used)):
            day1, start1, end1 = used[i-1]
            day2, start2, end2 = used[i]

            if day1 == day2  and start2 < end1:
                return False
        
        return True

    def _time_collision_constraint(self, 
                           assignment: Tuple[int, int, str], 
                           duration: float=1.) -> bool:
        return self._no_time_collision_chk(assignment, duration)
    
    def _non_overlapping_grp_constraint(self, *assignments, group) -> bool:
        return self._no_overlap_group_chk(assignments, group=group)

    def _create_domains(self, 
                        subjects: List[Subject], 
                        classrooms: List[Classroom]) -> None:
        """
        Function to create domains for each variable.

        :params:
            subjects: List[Subject] = List of available subjects.
            classrooms: List[Classroom] = List of available classrooms.
        :return None:
        """
        for subject in subjects:
            s_id: str = subject.subject_id
            duration: float = subject.duration
            classroom_id: Optional[str] = subject.classroom_id.classroom_id if subject.classroom_id else None

            domains_map = {}

            slots_needed = int(duration * 2)
            domain = [] # to cache day, start and room

            for (day, start) in self.time_slots:
                end = start + slots_needed

                if end <= int(self.hours_per_day * 2):
                    if classroom_id:
                        domain.append((day, start, classroom_id))
                    else:
                        for classroom in classrooms:
                            domain.append((day, start, getattr(classroom, "classroom_id", None)))

            if len(domain) < 1:
                logger.warning("Domain is empty")
                continue

            # add randomisation to domain
            random.shuffle(domain)
            domains_map[s_id] = domain

            # sort sujects by their weightage
            sorted_subs = sorted(domains_map.items(), key=lambda x: len(x[1]))

            for s_id, domain in sorted_subs:
                self.problem.addVariable(s_id, domain)
    
    def _add_constraints(self, subjects: List[Subject]) -> None:
        """
        Function to add constraints to the CSP solver.

        :param:
            subjects: List[Subject] = List of available subjects.
        :return None:
        """
        lecturer_groups = defaultdict(list)
        classroom_groups = defaultdict(list)

        for sub in subjects:
            # avoid allocating to lunch breaks
            self.problem.addConstraint(
                partial(self._time_collision_constraint, duration=sub.duration),
                (sub.subject_id,)
            )

            lecturer_groups[sub.lecturer_id].append(sub)
            classroom_groups[sub.classroom_id].append(sub)
        
        for _, group in classroom_groups.items():
            if len(group) > 1:
                self.problem.addConstraint(
                    partial(self._no_overlap_group_chk, group=group),
                    tuple(sub.subject_id for sub in group)
                )
        
        for _, group in lecturer_groups.items():
            if len(group) > 1:
                self.problem.addConstraint(
                    partial(self._no_overlap_group_chk, group=group),
                    tuple(sub.subject_id for sub in group)
                )

"""
# class CSPSchedulerORSAT(CSPScheduler):
#     slots_per_day: int = 0

#     def run(self, data: Dict[str, List[Any]])->Optional[dict]:
#         logger.info("CSP Model (OR-Tools) is running")
#         result = None
#         self.slots_per_day = int(self.hours_per_day * 2)

#         # get the data
#         classrooms = data.get("classrooms") or []
#         subjects = data.get("subjects") or []
        
#         if not subjects or not classrooms:
#             logger.warning("No subjects or classrooms provided")
#             return result
        
#         # map classroom id to integers
#         classroom_ids = [getattr(classroom, "classroom_id", None) for classroom in classrooms]
#         classroom_id_int = {cid: i for i, cid in enumerate(classroom_ids)}

#         model = cp_model.CpModel()
#         logger.info("Created CP Model")

#         # Add variables: subject, day, start, classroom
#         vars = {}
#         for subject in subjects:
#             sid = subject.subject_id
#             duration_slots = int(subject.duration * 2)

#             day_var = model.NewIntVar(1, self.working_days, f"day_{sid}")
#             start_var = model.NewIntVar(0, int(self.hours_per_day * 2), f"start_{sid}")

#             # prevent no out of range start times
#             model.Add(start_var + duration_slots <= self.slots_per_day)

#             if subject.classroom_id and subject.classroom_id.classroom_id in classroom_id_int:
#                 # fixed classroom
#                 room_var = model.NewConstant(classroom_id_int[subject.classroom_id.classroom_id])
#             else:
#                 room_var = model.NewIntVar(0, len(classrooms) - 1, f"room_{sid}")
            
#             vars[sid] = (day_var, start_var, room_var)

#         # Add constraints
#         self._add_constraints(model=model, vars=vars, subjects=subjects)

#         # Solve
#         solver = cp_model.CpSolver()
#         # solver.parameters.randomize_search = True
#         solver.parameters.num_search_workers = 8
#         status = solver.Solve(model=model)

#         if status != cp_model.FEASIBLE and status != cp_model.OPTIMAL:
#             logger.info("No feasible solution found")
#             return result
        
#         result = {}
#         subjects_as_dict = self.parse(subjects)
#         subjects_lookup = {sub["subject_id"]: sub for sub in subjects_as_dict}

#         for sid, (day_var, start_var, room_var) in vars.items():
#             day = solver.Value(day_var)
#             start = solver.Value(start_var)
#             room_int = solver.Value(room_var)
#             room = classroom_ids[room_int]
#             subject = subjects_lookup[sid]
#             duration = float(subject["duration"])

#             info = {
#                 "name" : subject.get("name", ""),
#                 "classroom_id" : room,
#                 "day" : self.days_map.get(day, f"Day-{day}"),
#                 "start" : self.slot_to_time(slot_index=start),
#                 "end" : self.slot_to_time(slot_index=(start + int(duration * 2))),
#                 "lecturer_id" : subject["lecturer_id"],
#                 "duration" : duration,
#                 "level" : subject.get("level", ""),
#             }
#             result[sid] = info

#         # Sort results
#         result = dict(sorted(result.items(), key=lambda x: (self.reverse_day_map[x[1]["day"]], x[1]["start"])))

        
#         logger.info("Computed results with OR-Tools")
#         return result

#     def _add_constraints(self, model, vars, subjects: List[Subject]) -> None:
#         # Lunch break slots (e.g., 12:00-12:30)
#         lunch_start = (12 - 9) * 2  # slot index for 12:00 pm
#         lunch_slots = {lunch_start, lunch_start + 1}

#         # Group subjects by lecturer and classroom
#         lecturer_groups = defaultdict(list)
#         classroom_groups = defaultdict(list)

#         for sub in subjects:
#             lecturer_groups[sub.lecturer_id].append(sub)
#             classroom_groups[sub.classroom_id.classroom_id].append(sub)

#         # Lunch break constraint: no class overlaps lunch slots
#         self._lunch_break_constraints(model, vars, subjects, lunch_slots)

#         def add_no_overlapping_constraint(group):
#             n = len(group)
#             for i in range(n):
#                 for j in range(i + 1, n):
#                     s1 = group[i]
#                     s2 = group[j]
#                     d1, start1, room1 = vars[s1.subject_id]
#                     d2, start2, room2 = vars[s2.subject_id]
#                     dur1 = int(s1.duration * 2)
#                     dur2 = int(s2.duration * 2)

#                     # If same day and same room or same lecturer, no overlap in time
#                     # Overlap condition:
#                     # d1 == d2 AND (start1 < start2 + dur2) AND (start2 < start1 + dur1)
#                     # Add constraint: NOT overlap

#                     # Create boolean variables for conditions
#                     same_day = model.NewBoolVar(f'same_day_{s1.subject_id}_{s2.subject_id}')
#                     model.Add(d1 == d2).OnlyEnforceIf(same_day)
#                     model.Add(d1 != d2).OnlyEnforceIf(same_day.Not())

#                     # Time overlap conditions
#                     start1_before_end2 = model.NewBoolVar(f'start1_before_end2_{s1.subject_id}_{s2.subject_id}')
#                     model.Add(start1 < start2 + dur2).OnlyEnforceIf(start1_before_end2)
#                     model.Add(start1 >= start2 + dur2).OnlyEnforceIf(start1_before_end2.Not())

#                     start2_before_end1 = model.NewBoolVar(f'start2_before_end1_{s1.subject_id}_{s2.subject_id}')
#                     model.Add(start2 < start1 + dur1).OnlyEnforceIf(start2_before_end1)
#                     model.Add(start2 >= start1 + dur1).OnlyEnforceIf(start2_before_end1.Not())

#                     overlap = model.NewBoolVar(f'overlap_{s1.subject_id}_{s2.subject_id}')
#                     model.AddBoolAnd([same_day, start1_before_end2, start2_before_end1]).OnlyEnforceIf(overlap)
#                     model.AddBoolOr([same_day.Not(), start1_before_end2.Not(), start2_before_end1.Not()]).OnlyEnforceIf(overlap.Not())

#                     # For lecturer group: always no overlap
#                     # For classroom group: only if rooms are same
#                     # So add constraints accordingly

#                     # For lecturer group: no overlap
#                     if s1.lecturer_id == s2.lecturer_id:
#                         model.Add(overlap == 0)

#                     # For classroom group: no overlap if rooms are same
#                     if s1.classroom_id.classroom_id == s2.classroom_id.classroom_id:
#                         # If same room, no overlap
#                         same_room = model.NewBoolVar(f'same_room_{s1.subject_id}_{s2.subject_id}')
#                         model.Add(room1 == room2).OnlyEnforceIf(same_room)
#                         model.Add(room1 != room2).OnlyEnforceIf(same_room.Not())

#                         # Combine same_day and same_room
#                         same_day_same_room = model.NewBoolVar(f'same_day_same_room_{s1.subject_id}_{s2.subject_id}')
#                         model.AddBoolAnd([same_day, same_room]).OnlyEnforceIf(same_day_same_room)
#                         model.AddBoolOr([same_day.Not(), same_room.Not()]).OnlyEnforceIf(same_day_same_room.Not())
                        
#                         # If same day and same room, no overlap
#                         model.AddImplication(same_day_same_room, overlap.Not())

#         # add no overlapping constraints for lecturer and classroom groups
#         for group in lecturer_groups.values():
#             if len(group) > 1:
#                 add_no_overlapping_constraint(group)

#         for group in classroom_groups.values():
#             if len(group) > 1:
#                 add_no_overlapping_constraint(group)

#         # Balance day distribution
#         self._balance_day_distribution(model, vars, subjects)

#     def _lunch_break_constraints(self, model, vars, subjects, lunch_slots):
#         for sub in subjects:
#             s_id = sub.subject_id
#             day_var, start_var, _ = vars[s_id]
#             duration_slots = int(sub.duration * 2)

#             before_lunch = model.NewBoolVar(f"before_lunch_{s_id}")
#             after_lunch = model.NewBoolVar(f"after_lunch_{s_id}")

#             # Forbid start times that cause overlap with lunch slots
#             for lunch_slot in lunch_slots:
#                 # start + duration > lunch_slot AND start <= lunch_slot
#                 # means overlap, so forbid these start times
#                 # Implement as: start_var + duration_slots <= lunch_slot OR start_var > lunch_slot
#                 model.Add(start_var + duration_slots <= lunch_slot). \
#                     OnlyEnforceIf(before_lunch)
#                 model.Add(start_var + duration_slots > lunch_slot). \
#                     OnlyEnforceIf(before_lunch.Not())
#                 model.Add(start_var > lunch_slot). \
#                     OnlyEnforceIf(after_lunch)
#                 model.Add(start_var <= lunch_slot). \
#                     OnlyEnforceIf(after_lunch.Not())

#                 model.AddBoolOr([
#                     before_lunch,
#                     after_lunch,
#                 ])

#     def _balance_day_distribution(self, model, vars, subjects: List[Subject]) -> None:
#         day_counts = []

#         for day in range(1, self.working_days + 1):
#             indicators = []
#             for sid, (day_var, _, _) in vars.items():
#                 is_today = model.NewBoolVar(f"{sid}_is_day{day}")
#                 model.Add(day_var==day).OnlyEnforceIf(is_today)
#                 model.Add(day_var!=day).OnlyEnforceIf(is_today.Not())
#                 indicators.append(is_today)

#             count = model.NewIntVar(0, len(subjects), f"count_day_{day}")
#             model.Add(count == sum(indicators))
#             day_counts.append(count)

#         max_classes = model.NewIntVar(0, len(subjects), "max_classes")
#         min_classes = model.NewIntVar(0, len(subjects), "min_classes")
#         model.AddMaxEquality(max_classes, day_counts)
#         model.AddMinEquality(min_classes, day_counts)

#         # Objective: minimise imbalance (max - min)
#         model.Minimize(max_classes - min_classes)
"""

class CSPSchedulerORSAT(CSPScheduler):
    slots_per_day: int = 0

    def run(self, data: Dict[str, List[Any]])->Optional[dict]:
        logger.info("CSP Model (OR-Tools) is running")
        result = None
        self.slots_per_day = int(self.hours_per_day * 2)

        # get the data
        classrooms = data.get("classrooms") or []
        subjects = data.get("subjects") or []
        
        if not subjects or not classrooms:
            logger.warning("No subjects or classrooms provided")
            return result
        
        # map classroom id to integers
        classroom_ids = [getattr(classroom, "classroom_id", None) for classroom in classrooms]
        classroom_id_int = {cid: i for i, cid in enumerate(classroom_ids)}

        model = cp_model.CpModel()
        logger.info("Created CP Model")

        # Add variables: subject, day, start, classroom
        vars = {}
        for subject in subjects:
            sid = subject.subject_id
            duration_slots = int(subject.duration * 2)

            day_var = model.NewIntVar(1, self.working_days, f"day_{sid}")
            start_var = model.NewIntVar(0, self.slots_per_day - duration_slots, f"start_{sid}")

            if subject.classroom_id and subject.classroom_id.classroom_id in classroom_id_int:
                # fixed classroom
                room_var = model.NewConstant(classroom_id_int[subject.classroom_id.classroom_id])
            else:
                room_var = model.NewIntVar(0, len(classrooms) - 1, f"room_{sid}")
            
            vars[sid] = (day_var, start_var, room_var, duration_slots)

        # Add constraints
        self._add_constraints(model=model, vars=vars, subjects=subjects, classrooms=classrooms)

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.num_search_workers = 8
        solver.parameters.max_time_in_seconds = 30.0
        
        status = solver.Solve(model=model)

        logger.info(f"Solver status: {solver.StatusName(status)}")
        logger.info(f"Solution found: {status in [cp_model.FEASIBLE, cp_model.OPTIMAL]}")

        if status != cp_model.FEASIBLE and status != cp_model.OPTIMAL:
            logger.info("No feasible solution found")
            return None
        
        result = {}
        subjects_as_dict = self.parse(subjects)
        subjects_lookup = {sub["subject_id"]: sub for sub in subjects_as_dict}

        for sid, (day_var, start_var, room_var, _) in vars.items():
            day = solver.Value(day_var)
            start = solver.Value(start_var)
            room_int = solver.Value(room_var)
            room = classroom_ids[room_int]
            subject = subjects_lookup[sid]
            duration = float(subject["duration"])

            info = {
                "name": subject.get("name", ""),
                "classroom_id": room,
                "day": self.days_map.get(day, f"Day-{day}"),
                "start": self.slot_to_time(slot_index=start),
                "end": self.slot_to_time(slot_index=(start + int(duration * 2))),
                "lecturer_id": subject["lecturer_id"],
                "duration": duration,
                "level": subject.get("level", ""),
            }
            result[sid] = info

        # Sort results
        result = dict(sorted(result.items(), key=lambda x: (self.reverse_day_map[x[1]["day"]], x[1]["start"])))

        logger.info("Computed results with OR-Tools")
        return result

    def _add_constraints(self, model, vars, subjects: List[Subject], classrooms: List) -> None:
        # Lunch break slots (e.g., 12:00-12:30)
        lunch_start = (12 - 9) * 2  # slot index for 12:00 pm
        lunch_slots = {lunch_start, lunch_start + 1}

        # Add lunch break constraints
        self._lunch_break_constraints(model, vars, subjects, lunch_slots)

        # Add no-overlap constraints - FIXED VERSION
        self._add_no_overlap_constraints(model, vars, subjects, classrooms)

        # Balance day distribution (as soft constraint)
        self._balance_day_distribution(model, vars, subjects)

    def _add_no_overlap_constraints(self, model, vars, subjects: List[Subject], classrooms: List) -> None:
        """Add no-overlap constraints for classrooms and lecturers"""
        # Group by lecturer
        lecturer_subjects = defaultdict(list)
        for subject in subjects:
            lecturer_subjects[subject.lecturer_id].append(subject)

        # Add lecturer constraints
        for lecturer, lect_subjects in lecturer_subjects.items():
            if len(lect_subjects) > 1:
                self._add_lecturer_no_overlap(model, vars, lect_subjects)

        # Add classroom constraints - FIXED: check ALL possible classroom assignments
        self._add_classroom_no_overlap_all(model, vars, subjects, classrooms)

    def _add_lecturer_no_overlap(self, model, vars, subjects: List[Subject]) -> None:
        """No overlap for same lecturer - FIXED VERSION"""
        n = len(subjects)
        for i in range(n):
            for j in range(i + 1, n):
                s1, s2 = subjects[i], subjects[j]
                d1, start1, r1, dur1 = vars[s1.subject_id]
                d2, start2, r2, dur2 = vars[s2.subject_id]

                # Create boolean variables for the conditions
                condition1 = model.NewBoolVar(f'cond1_lect_{s1.subject_id}_{s2.subject_id}')
                condition2 = model.NewBoolVar(f'cond2_lect_{s1.subject_id}_{s2.subject_id}')
                condition3 = model.NewBoolVar(f'cond3_lect_{s1.subject_id}_{s2.subject_id}')

                # Condition 1: start1 >= start2 + dur2
                model.Add(start1 >= start2 + dur2).OnlyEnforceIf(condition1)
                model.Add(start1 < start2 + dur2).OnlyEnforceIf(condition1.Not())

                # Condition 2: start2 >= start1 + dur1
                model.Add(start2 >= start1 + dur1).OnlyEnforceIf(condition2)
                model.Add(start2 < start1 + dur1).OnlyEnforceIf(condition2.Not())

                # Condition 3: d1 != d2
                model.Add(d1 != d2).OnlyEnforceIf(condition3)
                model.Add(d1 == d2).OnlyEnforceIf(condition3.Not())

                # At least one condition must be true
                model.AddBoolOr([condition1, condition2, condition3])

    def _add_classroom_no_overlap_all(self, model, vars, subjects: List[Subject], classrooms: List) -> None:
        """No overlap for ANY two subjects assigned to the same classroom"""
        n = len(subjects)
        for i in range(n):
            for j in range(i + 1, n):
                s1, s2 = subjects[i], subjects[j]
                d1, start1, r1, dur1 = vars[s1.subject_id]
                d2, start2, r2, dur2 = vars[s2.subject_id]

                # For every possible classroom assignment, ensure no overlap
                for room_idx in range(len(classrooms)):
                    # Create indicator for s1 in this classroom
                    s1_in_room = model.NewBoolVar(f's1_{s1.subject_id}_in_room_{room_idx}')
                    model.Add(r1 == room_idx).OnlyEnforceIf(s1_in_room)
                    model.Add(r1 != room_idx).OnlyEnforceIf(s1_in_room.Not())

                    # Create indicator for s2 in this classroom  
                    s2_in_room = model.NewBoolVar(f's2_{s2.subject_id}_in_room_{room_idx}')
                    model.Add(r2 == room_idx).OnlyEnforceIf(s2_in_room)
                    model.Add(r2 != room_idx).OnlyEnforceIf(s2_in_room.Not())

                    # Both in same room
                    both_same_room = model.NewBoolVar(f'both_same_room_{s1.subject_id}_{s2.subject_id}_{room_idx}')
                    model.AddBoolAnd([s1_in_room, s2_in_room]).OnlyEnforceIf(both_same_room)
                    model.AddBoolOr([s1_in_room.Not(), s2_in_room.Not()]).OnlyEnforceIf(both_same_room.Not())

                    # Same day
                    same_day = model.NewBoolVar(f'same_day_{s1.subject_id}_{s2.subject_id}')
                    model.Add(d1 == d2).OnlyEnforceIf(same_day)
                    model.Add(d1 != d2).OnlyEnforceIf(same_day.Not())

                    # Both same room AND same day
                    same_room_and_day = model.NewBoolVar(f'same_room_day_{s1.subject_id}_{s2.subject_id}_{room_idx}')
                    model.AddBoolAnd([both_same_room, same_day]).OnlyEnforceIf(same_room_and_day)
                    model.AddBoolOr([both_same_room.Not(), same_day.Not()]).OnlyEnforceIf(same_room_and_day.Not())

                    # Create boolean variables for no-overlap conditions
                    no_overlap1 = model.NewBoolVar(f'no_overlap1_{s1.subject_id}_{s2.subject_id}_{room_idx}')
                    no_overlap2 = model.NewBoolVar(f'no_overlap2_{s1.subject_id}_{s2.subject_id}_{room_idx}')
                    
                    model.Add(start1 >= start2 + dur2).OnlyEnforceIf(no_overlap1)
                    model.Add(start1 < start2 + dur2).OnlyEnforceIf(no_overlap1.Not())
                    
                    model.Add(start2 >= start1 + dur1).OnlyEnforceIf(no_overlap2)
                    model.Add(start2 < start1 + dur1).OnlyEnforceIf(no_overlap2.Not())

                    # If same room and day, then at least one no-overlap condition must be true
                    model.AddBoolOr([no_overlap1, no_overlap2]).OnlyEnforceIf(same_room_and_day)

    def _lunch_break_constraints(self, model, vars, subjects, lunch_slots):
        """Prevent classes from overlapping with lunch break"""
        for sub in subjects:
            s_id = sub.subject_id
            day_var, start_var, room_var, duration_slots = vars[s_id]
            
            # Simple constraint: class must end before lunch OR start after lunch
            for lunch_slot in lunch_slots:
                # Class should not contain lunch slot
                # This means: end <= lunch_slot OR start > lunch_slot
                ends_before = model.NewBoolVar(f"ends_before_{s_id}_{lunch_slot}")
                starts_after = model.NewBoolVar(f"starts_after_{s_id}_{lunch_slot}")
                
                model.Add(start_var + duration_slots <= lunch_slot).OnlyEnforceIf(ends_before)
                model.Add(start_var > lunch_slot).OnlyEnforceIf(starts_after)
                
                model.AddBoolOr([ends_before, starts_after])

    def _balance_day_distribution(self, model, vars, subjects: List[Subject]) -> None:
        """Balance the distribution of classes across days - as soft constraint"""
        day_counts = []

        for day in range(1, self.working_days + 1):
            indicators = []
            for sid, (day_var, _, _, _) in vars.items():
                is_today = model.NewBoolVar(f"{sid}_is_day{day}")
                model.Add(day_var == day).OnlyEnforceIf(is_today)
                model.Add(day_var != day).OnlyEnforceIf(is_today.Not())
                indicators.append(is_today)

            count = model.NewIntVar(0, len(subjects), f"count_day_{day}")
            model.Add(count == sum(indicators))
            day_counts.append(count)

        max_classes = model.NewIntVar(0, len(subjects), "max_classes")
        min_classes = model.NewIntVar(0, len(subjects), "min_classes")
        model.AddMaxEquality(max_classes, day_counts)
        model.AddMinEquality(min_classes, day_counts)

        # Objective: minimise imbalance (max - min)
        imbalance = model.NewIntVar(0, len(subjects), "imbalance")
        model.Add(imbalance == max_classes - min_classes)
        model.Minimize(imbalance)

class CSPSchedulerORSATv2(CSPScheduler):
    slots_per_day: int = 0

    def run(self, data: Dict[str, List[Any]])->Optional[dict]:
        logger.info("CSP Model (OR-Tools) is running")
        result = None
        self.slots_per_day = int(self.hours_per_day * 2)

        # get the data
        classrooms = data.get("classrooms") or []
        subjects = data.get("subjects") or []
        
        if not subjects or not classrooms:
            logger.warning("No subjects or classrooms provided")
            return result
        
        # map classroom id to integers
        classroom_ids = [getattr(classroom, "classroom_id", None) for classroom in classrooms]
        classroom_id_int = {cid: i for i, cid in enumerate(classroom_ids)}

        model = cp_model.CpModel()
        logger.info("Created CP Model")

        # Add variables: subject, day, start, classroom
        vars = {}
        for subject in subjects:
            sid = subject.subject_id
            duration_slots = int(subject.duration * 2)

            day_var = model.NewIntVar(1, self.working_days, f"day_{sid}")
            start_var = model.NewIntVar(0, self.slots_per_day - duration_slots, f"start_{sid}")

            if subject.classroom_id and subject.classroom_id.classroom_id in classroom_id_int:
                # fixed classroom
                room_var = model.NewConstant(classroom_id_int[subject.classroom_id.classroom_id])
            else:
                room_var = model.NewIntVar(0, len(classrooms) - 1, f"room_{sid}")
            
            vars[sid] = (day_var, start_var, room_var, duration_slots)

        # Add constraints
        self._add_constraints(model=model, vars=vars, subjects=subjects, classrooms=classrooms)

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.num_search_workers = 8
        solver.parameters.max_time_in_seconds = 30.0
        
        status = solver.Solve(model=model)

        logger.info(f"Solver status: {solver.StatusName(status)}")
        logger.info(f"Solution found: {status in [cp_model.FEASIBLE, cp_model.OPTIMAL]}")

        if status != cp_model.FEASIBLE and status != cp_model.OPTIMAL:
            logger.info("No feasible solution found")
            return None
        
        result = {}
        subjects_as_dict = self.parse(subjects)
        subjects_lookup = {sub["subject_id"]: sub for sub in subjects_as_dict}

        for sid, (day_var, start_var, room_var, _) in vars.items():
            day = solver.Value(day_var)
            start = solver.Value(start_var)
            room_int = solver.Value(room_var)
            room = classroom_ids[room_int]
            subject = subjects_lookup[sid]
            duration = float(subject["duration"])
            # Map solver day (1..N) -> actual operation day number
            actual_day = self.operation_days[day - 1] if self.operation_days and 1 <= day <= len(self.operation_days) else day


            info = {
                "name": subject.get("name", ""),
                "classroom_id": room,
                # "day": self.days_map.get(day, f"Day-{day}"),
                "day": self.days_map.get(actual_day, f"Day-{day}"),
                "start": self.slot_to_time(slot_index=start),
                "end": self.slot_to_time(slot_index=(start + int(duration * 2))),
                "lecturer_id": subject["lecturer_id"],
                "duration": duration,
                "level": subject.get("level", ""),
            }
            result[sid] = info

        # Sort results
        # result = dict(sorted(result.items(), key=lambda x: (self.reverse_day_map[x[1]["day"]], x[1]["start"])))
        result = dict(sorted(result.items(), key=lambda x: (x[1]["day"], x[1]["start"])))


        logger.info("Computed results with OR-Tools")
        return result

    def _add_constraints(self, model, vars, subjects: List[Subject], classrooms: List) -> None:
        lecturer_availability_map = {}
        if hasattr(self, "lecturers_data"):
            # Example structure expected: [{ "lecturer_id": "L1", "availability": [1,3,5] }, ...]
            for lec in self.lecturers_data:
                lid = lec.get("lecturer_id")
                availability = lec.get("lecturer_availability", list(range(1, self.working_days + 1)))
                if isinstance(availability, str):  # handle if stored as comma-separated text
                    availability = [int(x.strip()) for x in availability.split(",") if x.strip().isdigit()]
                lecturer_availability_map[lid] = availability

        # Add subject availability constraints
        for subject in subjects:
            sid = subject.subject_id
            day_var = vars[sid][0]  # day_var is the first element in the tuple
            # availability = subject.subject_availability or list(range(1, self.working_days + 1))  # Default to all days if empty
            # if availability:
            #     model.AddAllowedAssignments([day_var], [(day,) for day in availability])  # Fixed: Wrap day_var in a list
            subject_days = subject.subject_availability or list(range(1, self.working_days + 1))
            lecturer_days = lecturer_availability_map.get(subject.lecturer_id, list(range(1, self.working_days + 1)))
            # Intersection of both
            valid_days = sorted(set(subject_days).intersection(set(lecturer_days)))

            if not valid_days:
                logger.warning(f"No valid days for {subject.name} ({subject.subject_id}) — defaulting to all days.")
                valid_days = list(range(1, self.working_days + 1))
            # Restrict day_var to these valid days
            model.AddAllowedAssignments([day_var], [(d,) for d in valid_days])

        # Lunch break slots (e.g., 12:00-12:30)
        lunch_start = (12 - 9) * 2  # slot index for 12:00 pm
        lunch_slots = {lunch_start, lunch_start + 1}
        
        # Add lunch break constraints
        self._lunch_break_constraints(model, vars, subjects, lunch_slots)
        # Add no-overlap constraints
        self._add_no_overlap_constraints(model, vars, subjects, classrooms)
        # Balance day distribution (as soft constraint)
        self._balance_day_distribution(model, vars, subjects)

    def _add_no_overlap_constraints(self, model, vars, subjects: List[Subject], classrooms: List) -> None:
        """Add no-overlap constraints for classrooms and lecturers"""
        # Group by lecturer
        lecturer_subjects = defaultdict(list)
        for subject in subjects:
            lecturer_subjects[subject.lecturer_id].append(subject)

        # Add lecturer constraints
        for lecturer, lect_subjects in lecturer_subjects.items():
            if len(lect_subjects) > 1:
                self._add_lecturer_no_overlap(model, vars, lect_subjects)

        # Add classroom constraints - FIXED: check ALL possible classroom assignments
        self._add_classroom_no_overlap_all(model, vars, subjects, classrooms)

    def _add_lecturer_no_overlap(self, model, vars, subjects: List[Subject]) -> None:
        """No overlap for same lecturer - FIXED VERSION"""
        n = len(subjects)
        for i in range(n):
            for j in range(i + 1, n):
                s1, s2 = subjects[i], subjects[j]
                d1, start1, r1, dur1 = vars[s1.subject_id]
                d2, start2, r2, dur2 = vars[s2.subject_id]

                # Create boolean variables for the conditions
                condition1 = model.NewBoolVar(f'cond1_lect_{s1.subject_id}_{s2.subject_id}')
                condition2 = model.NewBoolVar(f'cond2_lect_{s1.subject_id}_{s2.subject_id}')
                condition3 = model.NewBoolVar(f'cond3_lect_{s1.subject_id}_{s2.subject_id}')

                # Condition 1: start1 >= start2 + dur2
                model.Add(start1 >= start2 + dur2).OnlyEnforceIf(condition1)
                model.Add(start1 < start2 + dur2).OnlyEnforceIf(condition1.Not())

                # Condition 2: start2 >= start1 + dur1
                model.Add(start2 >= start1 + dur1).OnlyEnforceIf(condition2)
                model.Add(start2 < start1 + dur1).OnlyEnforceIf(condition2.Not())

                # Condition 3: d1 != d2
                model.Add(d1 != d2).OnlyEnforceIf(condition3)
                model.Add(d1 == d2).OnlyEnforceIf(condition3.Not())

                # At least one condition must be true
                model.AddBoolOr([condition1, condition2, condition3])

    def _add_classroom_no_overlap_all(self, model, vars, subjects: List[Subject], classrooms: List) -> None:
        """No overlap for ANY two subjects assigned to the same classroom"""
        n = len(subjects)
        for i in range(n):
            for j in range(i + 1, n):
                s1, s2 = subjects[i], subjects[j]
                d1, start1, r1, dur1 = vars[s1.subject_id]
                d2, start2, r2, dur2 = vars[s2.subject_id]

                # For every possible classroom assignment, ensure no overlap
                for room_idx in range(len(classrooms)):
                    # Create indicator for s1 in this classroom
                    s1_in_room = model.NewBoolVar(f's1_{s1.subject_id}_in_room_{room_idx}')
                    model.Add(r1 == room_idx).OnlyEnforceIf(s1_in_room)
                    model.Add(r1 != room_idx).OnlyEnforceIf(s1_in_room.Not())

                    # Create indicator for s2 in this classroom  
                    s2_in_room = model.NewBoolVar(f's2_{s2.subject_id}_in_room_{room_idx}')
                    model.Add(r2 == room_idx).OnlyEnforceIf(s2_in_room)
                    model.Add(r2 != room_idx).OnlyEnforceIf(s2_in_room.Not())

                    # Both in same room
                    both_same_room = model.NewBoolVar(f'both_same_room_{s1.subject_id}_{s2.subject_id}_{room_idx}')
                    model.AddBoolAnd([s1_in_room, s2_in_room]).OnlyEnforceIf(both_same_room)
                    model.AddBoolOr([s1_in_room.Not(), s2_in_room.Not()]).OnlyEnforceIf(both_same_room.Not())

                    # Same day
                    same_day = model.NewBoolVar(f'same_day_{s1.subject_id}_{s2.subject_id}')
                    model.Add(d1 == d2).OnlyEnforceIf(same_day)
                    model.Add(d1 != d2).OnlyEnforceIf(same_day.Not())

                    # Both same room AND same day
                    same_room_and_day = model.NewBoolVar(f'same_room_day_{s1.subject_id}_{s2.subject_id}_{room_idx}')
                    model.AddBoolAnd([both_same_room, same_day]).OnlyEnforceIf(same_room_and_day)
                    model.AddBoolOr([both_same_room.Not(), same_day.Not()]).OnlyEnforceIf(same_room_and_day.Not())

                    # Create boolean variables for no-overlap conditions
                    no_overlap1 = model.NewBoolVar(f'no_overlap1_{s1.subject_id}_{s2.subject_id}_{room_idx}')
                    no_overlap2 = model.NewBoolVar(f'no_overlap2_{s1.subject_id}_{s2.subject_id}_{room_idx}')
                    
                    model.Add(start1 >= start2 + dur2).OnlyEnforceIf(no_overlap1)
                    model.Add(start1 < start2 + dur2).OnlyEnforceIf(no_overlap1.Not())
                    
                    model.Add(start2 >= start1 + dur1).OnlyEnforceIf(no_overlap2)
                    model.Add(start2 < start1 + dur1).OnlyEnforceIf(no_overlap2.Not())

                    # If same room and day, then at least one no-overlap condition must be true
                    model.AddBoolOr([no_overlap1, no_overlap2]).OnlyEnforceIf(same_room_and_day)

    def _lunch_break_constraints(self, model, vars, subjects, lunch_slots):
        """Prevent classes from overlapping with lunch break"""
        for sub in subjects:
            s_id = sub.subject_id
            day_var, start_var, room_var, duration_slots = vars[s_id]
            
            # Simple constraint: class must end before lunch OR start after lunch
            for lunch_slot in lunch_slots:
                # Class should not contain lunch slot
                # This means: end <= lunch_slot OR start > lunch_slot
                ends_before = model.NewBoolVar(f"ends_before_{s_id}_{lunch_slot}")
                starts_after = model.NewBoolVar(f"starts_after_{s_id}_{lunch_slot}")
                
                model.Add(start_var + duration_slots <= lunch_slot).OnlyEnforceIf(ends_before)
                model.Add(start_var > lunch_slot).OnlyEnforceIf(starts_after)
                
                model.AddBoolOr([ends_before, starts_after])

    def _balance_day_distribution(self, model, vars, subjects: List[Subject]) -> None:
        """Balance the distribution of classes across days - as soft constraint"""
        day_counts = []

        for day in range(1, self.working_days + 1):
            indicators = []
            for sid, (day_var, _, _, _) in vars.items():
                is_today = model.NewBoolVar(f"{sid}_is_day{day}")
                model.Add(day_var == day).OnlyEnforceIf(is_today)
                model.Add(day_var != day).OnlyEnforceIf(is_today.Not())
                indicators.append(is_today)

            count = model.NewIntVar(0, len(subjects), f"count_day_{day}")
            model.Add(count == sum(indicators))
            day_counts.append(count)

        max_classes = model.NewIntVar(0, len(subjects), "max_classes")
        min_classes = model.NewIntVar(0, len(subjects), "min_classes")
        model.AddMaxEquality(max_classes, day_counts)
        model.AddMinEquality(min_classes, day_counts)

        # Objective: minimise imbalance (max - min)
        imbalance = model.NewIntVar(0, len(subjects), "imbalance")
        model.Add(imbalance == max_classes - min_classes)
        model.Minimize(imbalance)