# Pantry Pal — Student Recipe Collection

A student-focused recipe collection for Mater Dei College. The app pairs a Laravel REST API with a React single-page interface. Students can discover budget meals, submit recipes for review, save favorites, and leave ratings. Admins can moderate submissions and maintain shared categories and ingredients.

## Stack

- Laravel 13 and PHP 8.3+
- Laravel Sanctum personal access tokens
- React 18, Vite, React Router, and Axios
- SQLite for a quick local start; MySQL is supported through Laravel's database configuration

## Local setup

1. Install PHP dependencies and frontend packages:

   ```powershell
   composer install
   npm install
   ```

2. Configure the environment and database. The checked-in example uses SQLite:

   ```powershell
   Copy-Item .env.example .env
   php artisan key:generate
   ```

   To use MySQL, set `DB_CONNECTION=mysql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `.env`, then create the configured database.

3. Create tables and starter categories/ingredients, then build the SPA:

   ```powershell
   php artisan migrate --seed
   npm run build
   ```

4. Start the app:

   ```powershell
   php artisan serve
   ```

   Open the local URL printed by Artisan. For frontend development with hot reload, run `npm run dev` in a second terminal.

## Accounts and roles

Public registration always creates a `student` account. Admin privileges are never accepted from the registration payload. To promote a trusted account, use Tinker:

```powershell
php artisan tinker
```

```php
App\Models\User::where('email', 'advisor@example.com')->update(['role' => 'admin']);
```

After promoting the account, sign out and sign back in so the React app refreshes the current user role.

## Main API routes

All routes are prefixed with `/api`. Sanctum-protected routes require `Authorization: Bearer <token>`.

| Method | Path | Access |
| --- | --- | --- |
| POST | `/register`, `/login` | Public |
| GET | `/user`, `/dashboard` | Signed-in |
| GET | `/my-recipes` | Signed-in; paginated personal submissions |
| GET | `/recipes` | Public; search, category, budget, prep-time, ingredient, and pagination filters |
| GET | `/recipes/{recipe}` | Public for approved recipes; owner/admin for other statuses |
| POST | `/recipes` | Signed-in; new recipes enter pending review |
| PUT/PATCH, DELETE | `/recipes/{recipe}` | Owner or admin |
| PATCH | `/recipes/{recipe}/moderation` | Admin |
| GET | `/categories`, `/ingredients` | Public |
| POST, PUT, DELETE | `/categories`, `/ingredients` | Admin |
| GET, POST | `/favorites` | Signed-in |
| DELETE | `/favorites/{recipe}` | Signed-in |
| GET | `/recipes/{recipe}/reviews` | Public for approved recipes |
| POST | `/recipes/{recipe}/reviews` | Signed-in |
| DELETE | `/reviews/{review}` | Review owner or admin |
| POST | `/logout` | Signed-in |

Recipe filters include `search`, `category` (slug), `budget_tier` (`low`, `medium`, `high`), `max_prep_time`, comma-separated `ingredient_ids`, and `per_page` (up to 30). API validation errors use Laravel's field-keyed `422` response format.

## Tests and production assets

```powershell
npm test
npm run build
```

`npm test` runs the Laravel test suite, including API authentication, recipe submission/moderation, filtering, favorites, reviews, and ownership checks.
