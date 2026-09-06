"""seed sample books

Revision ID: ccad4db3aaf3
Revises: b20134bd9e55
Create Date: 2026-09-06 12:40:31.040734

"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ccad4db3aaf3'
down_revision: Union[str, None] = 'b20134bd9e55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Lightweight, ad-hoc table definition (not imported from app.models) so this
# migration keeps working even if the ORM model changes shape later.
books_table = sa.table(
    "books",
    sa.column("title", sa.String),
    sa.column("author", sa.String),
    sa.column("isbn", sa.String),
    sa.column("category", sa.String),
    sa.column("description", sa.Text),
    sa.column("total_copies", sa.Integer),
    sa.column("available_copies", sa.Integer),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)

SEED_ISBNS = [
    "9780132350884",
    "9780134757599",
    "9780135957059",
    "9780201633610",
    "9780262033848",
    "9781491950357",
    "9780596007126",
    "9780062316097",
]

SEED_BOOKS = [
    {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "isbn": "9780132350884",
        "category": "Programming",
        "description": "A handbook of agile software craftsmanship.",
        "total_copies": 4,
    },
    {
        "title": "Refactoring",
        "author": "Martin Fowler",
        "isbn": "9780134757599",
        "category": "Programming",
        "description": "Improving the design of existing code.",
        "total_copies": 3,
    },
    {
        "title": "The Pragmatic Programmer",
        "author": "Andrew Hunt, David Thomas",
        "isbn": "9780135957059",
        "category": "Programming",
        "description": "Your journey to mastery, 20th anniversary edition.",
        "total_copies": 3,
    },
    {
        "title": "Design Patterns",
        "author": "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
        "isbn": "9780201633610",
        "category": "Software Engineering",
        "description": "Elements of reusable object-oriented software.",
        "total_copies": 2,
    },
    {
        "title": "Introduction to Algorithms",
        "author": "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
        "isbn": "9780262033848",
        "category": "Computer Science",
        "description": "A comprehensive introduction to the modern study of algorithms.",
        "total_copies": 2,
    },
    {
        "title": "Fluent Python",
        "author": "Luciano Ramalho",
        "isbn": "9781491950357",
        "category": "Programming",
        "description": "Clear, concise, and effective programming.",
        "total_copies": 3,
    },
    {
        "title": "Head First Design Patterns",
        "author": "Eric Freeman, Elisabeth Robson",
        "isbn": "9780596007126",
        "category": "Software Engineering",
        "description": "A brain-friendly guide to design patterns.",
        "total_copies": 2,
    },
    {
        "title": "Sapiens",
        "author": "Yuval Noah Harari",
        "isbn": "9780062316097",
        "category": "Non-fiction",
        "description": "A brief history of humankind.",
        "total_copies": 5,
    },
]


def upgrade() -> None:
    now = datetime.now(timezone.utc)
    rows = [
        {
            **book,
            "available_copies": book["total_copies"],
            "created_at": now,
            "updated_at": now,
        }
        for book in SEED_BOOKS
    ]
    op.bulk_insert(books_table, rows)


def downgrade() -> None:
    op.execute(books_table.delete().where(books_table.c.isbn.in_(SEED_ISBNS)))
