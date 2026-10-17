<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Ingredient;
use App\Models\Recipe;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecipeApiTest extends TestCase
{
    use RefreshDatabase;

    private Category $category;

    private Ingredient $ingredient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->category = Category::create(['name' => 'Dinner', 'slug' => 'dinner']);
        $this->ingredient = Ingredient::create(['name' => 'Rice', 'unit' => 'cup']);
    }

    public function test_students_can_submit_a_recipe_that_is_pending_until_reviewed(): void
    {
        $student = User::factory()->create();
        $this->actingAs($student, 'sanctum')
            ->postJson('/api/recipes', $this->recipePayload())
            ->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('ingredients.0.name', 'Rice');

        $this->assertDatabaseHas('recipes', [
            'user_id' => $student->id,
            'status' => 'pending',
            'title' => 'Quick rice bowl',
        ]);
    }

    public function test_students_cannot_moderate_recipes_and_admins_can_publish_them(): void
    {
        $student = User::factory()->create();
        $recipe = $this->createRecipe($student, 'pending');

        $this->actingAs($student, 'sanctum')
            ->patchJson("/api/recipes/{$recipe->id}/moderation", ['status' => 'approved'])
            ->assertForbidden();

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/recipes/{$recipe->id}/moderation", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('status', 'approved');

        $this->getJson('/api/recipes')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Budget rice bowl');
    }

    public function test_recipe_search_and_filters_only_return_matching_public_recipes(): void
    {
        $student = User::factory()->create();
        $matching = $this->createRecipe($student, 'approved', ['title' => 'Fast rice bowl', 'prep_time' => 10]);
        $matching->ingredients()->attach($this->ingredient->id, ['quantity' => '1 cup']);
        $this->createRecipe($student, 'pending', ['title' => 'Hidden rice bowl']);

        $this->getJson('/api/recipes?search=rice&budget_tier=low&max_prep_time=15&ingredient_ids='.$this->ingredient->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Fast rice bowl');

        $this->getJson('/api/recipes?budget_tier=unlimited')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('budget_tier');
    }

    public function test_favorites_and_reviews_are_owned_by_the_signed_in_student(): void
    {
        $author = User::factory()->create();
        $student = User::factory()->create();
        $recipe = $this->createRecipe($author, 'approved');

        $this->actingAs($student, 'sanctum')
            ->postJson('/api/favorites', ['recipe_id' => $recipe->id])
            ->assertCreated();
        $this->assertDatabaseHas('favorites', ['user_id' => $student->id, 'recipe_id' => $recipe->id]);

        $this->postJson("/api/recipes/{$recipe->id}/reviews", ['rating' => 5, 'comment' => 'Easy and filling.'])
            ->assertCreated()
            ->assertJsonPath('rating', 5);

        $this->assertDatabaseHas('reviews', ['user_id' => $student->id, 'recipe_id' => $recipe->id, 'rating' => 5]);
    }

    public function test_students_cannot_change_another_students_recipe(): void
    {
        $owner = User::factory()->create();
        $otherStudent = User::factory()->create();
        $recipe = $this->createRecipe($owner, 'approved');

        $this->actingAs($otherStudent, 'sanctum')
            ->deleteJson("/api/recipes/{$recipe->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('recipes', ['id' => $recipe->id]);
    }

    public function test_an_owner_can_update_a_recipe_and_it_returns_to_review(): void
    {
        $student = User::factory()->create();
        $recipe = $this->createRecipe($student, 'approved');
        $payload = $this->recipePayload();
        $payload['title'] = 'Updated rice bowl';

        $this->actingAs($student, 'sanctum')
            ->putJson("/api/recipes/{$recipe->id}", $payload)
            ->assertOk()
            ->assertJsonPath('title', 'Updated rice bowl')
            ->assertJsonPath('status', 'pending');
    }

    public function test_only_admins_can_manage_shared_recipe_lists(): void
    {
        $student = User::factory()->create();
        $this->actingAs($student, 'sanctum')
            ->postJson('/api/categories', ['name' => 'Dessert'])
            ->assertForbidden();

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/categories', ['name' => 'Dessert'])
            ->assertCreated()
            ->assertJsonPath('slug', 'dessert');
    }

    public function test_admins_can_update_and_remove_unused_categories_and_ingredients(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::create(['name' => 'Snack', 'slug' => 'snack']);
        $ingredient = Ingredient::create(['name' => 'Lentils']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/categories/{$category->id}", ['name' => 'Quick meals'])
            ->assertOk()
            ->assertJsonPath('slug', 'quick-meals');
        $this->putJson("/api/ingredients/{$ingredient->id}", ['name' => 'Red lentils', 'unit' => 'cup'])
            ->assertOk()
            ->assertJsonPath('unit', 'cup');
        $this->deleteJson("/api/categories/{$category->id}")->assertNoContent();
        $this->deleteJson("/api/ingredients/{$ingredient->id}")->assertNoContent();
    }

    private function recipePayload(): array
    {
        return [
            'category_id' => $this->category->id,
            'title' => 'Quick rice bowl',
            'description' => 'A quick meal for busy students.',
            'prep_time' => 10,
            'cook_time' => 15,
            'servings' => 2,
            'budget_tier' => 'low',
            'instructions' => 'Cook the rice. Add vegetables and serve warm.',
            'ingredients' => [
                ['ingredient_id' => $this->ingredient->id, 'quantity' => '1 cup'],
            ],
        ];
    }

    private function createRecipe(User $user, string $status, array $overrides = []): Recipe
    {
        return Recipe::create([
            'user_id' => $user->id,
            'category_id' => $this->category->id,
            'title' => 'Budget rice bowl',
            'prep_time' => 15,
            'cook_time' => 10,
            'servings' => 2,
            'budget_tier' => 'low',
            'instructions' => 'Cook and serve.',
            'status' => $status,
            ...$overrides,
        ]);
    }
}
