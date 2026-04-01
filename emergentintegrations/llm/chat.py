from pydantic import BaseModel
from typing import List

class UserMessage(BaseModel):
    content: str
    role: str = "user"

class LlmChat:
    def __init__(self, api_key: str = None):
        self.api_key = api_key

    async def generate(self, messages: List[UserMessage]):
        # Placeholder for actual LLM call
        return {"content": "LLM Service Active"}
