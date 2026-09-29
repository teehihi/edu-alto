# Sample course seed

The repository includes an idempotent, development-only seed at `scripts/seed-sample-course.sql`. It creates a demo instructor and a published, paid Python course with two sections and three text lessons. The first lesson is a preview; the course is priced at 299,000 VND so local checkout can be exercised.

Do not run this seed in production. It includes a development-only instructor account:

- Email: `demo.instructor@edualto.local`
- Password: `DemoInstructor!2026`

Start the local database and apply the seed from the repository root:

```sh
docker compose up -d postgres
docker compose exec -T postgres psql -U edualto -d edualto < scripts/seed-sample-course.sql
```

If the project uses custom `POSTGRES_USER` or `POSTGRES_DB` values, substitute those values in the `psql` command. Re-running the script updates the same demo rows instead of adding duplicates.

The course appears in the public catalog at `/courses` and at `/courses/lap-trinh-python-co-ban-cho-nguoi-moi` after the frontend and backend are running.
