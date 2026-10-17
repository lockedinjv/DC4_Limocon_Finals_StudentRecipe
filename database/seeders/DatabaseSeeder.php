<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Ingredient;
use Illuminate\Support\Str;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        foreach (['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as $name) {
            Category::firstOrCreate(
                ['name' => $name],
                ['slug' => Str::slug($name)],
            );
        }

        foreach (['Eggs', 'Rice', 'Pasta', 'Tomatoes', 'Onion', 'Garlic', 'Chicken', 'Beans', 'Oats'] as $name) {
            Ingredient::firstOrCreate(['name' => $name]);
        }
    }
}
