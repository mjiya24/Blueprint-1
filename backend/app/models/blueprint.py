from pydantic import BaseModel
from typing import List

class MatchDimensions(BaseModel):
    environment: str
    social: str
    assets: List[str]
    interests: List[str]

class BlueprintStep(BaseModel):
    step_number: int
    task: str

class BlueprintModel(BaseModel):
    title: str
    category: str
    startup_cost: int
    time_to_cash: str
    difficulty: str
    geo_targeted: bool
    optimal_locations: List[str]
    match_dimensions: MatchDimensions
    steps: List[BlueprintStep]
    ai_go_deeper_prompt: str
