from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "SuporteAgora ITSM"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "postgresql+psycopg2://itsm:itsm@db:5432/itsm"

    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
