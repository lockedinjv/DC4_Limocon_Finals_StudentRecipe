<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRecipeRequest;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RecipeController extends Controller
{
    public function mine(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->recipes()
                ->with(['category:id,name,slug', 'ingredients:id,name,unit'])
                ->withCount('reviews')
                ->latest()
                ->paginate(min(max($request->integer('per_page', 12), 1), 30)),
        );
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:100'],
            'budget_tier' => ['nullable', 'in:low,medium,high'],
            'max_prep_time' => ['nullable', 'integer', 'min:1', 'max:1440'],
            'ingredient_ids' => ['nullable', 'regex:/^\d+(,\d+)*$/'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:30'],
        ]);
        $query = Recipe::query()
            ->with(['user:id,name', 'category:id,name,slug', 'ingredients:id,name,unit'])
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->withCount('favorites')
            ->where(function ($query) use ($request) {
                $query->where('status', 'approved');

                if ($request->user()) {
                    $query->orWhere('user_id', $request->user()->id);
                    if ($request->user()->role === 'admin') {
                        $query->orWhereIn('status', ['pending', 'rejected']);
                    }
                }
            });

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($query) use ($search) {
                $query->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('ingredients', fn ($ingredients) => $ingredients->where('name', 'like', "%{$search}%"));
            });
        }

        if (! empty($filters['category'])) {
            $query->whereHas('category', fn ($category) => $category->where('slug', $filters['category']));
        }
        if (! empty($filters['budget_tier'])) {
            $query->where('budget_tier', $filters['budget_tier']);
        }
        if (! empty($filters['max_prep_time'])) {
            $query->where('prep_time', '<=', $filters['max_prep_time']);
        }
        if (! empty($filters['ingredient_ids'])) {
            $ingredientIds = array_unique(array_map('intval', explode(',', $filters['ingredient_ids'])));
            $query->whereHas('ingredients', fn ($ingredients) => $ingredients->whereIn('ingredients.id', $ingredientIds));
        }

        $recipes = $query->latest()->paginate($filters['per_page'] ?? 12);

        return response()->json($recipes);
    }

    public function show(Request $request, Recipe $recipe): JsonResponse
    {
        abort_unless(
            $recipe->status === 'approved'
            || $request->user()?->role === 'admin'
            || $request->user()?->id === $recipe->user_id,
            404,
        );

        return response()->json($recipe->load([
            'user:id,name',
            'category:id,name,slug',
            'ingredients:id,name,unit',
            'reviews.user:id,name',
        ])->loadAvg('reviews', 'rating')->loadCount('reviews'));
    }

    public function store(StoreRecipeRequest $request): JsonResponse
    {
        $data = $request->validated();
        $ingredients = $data['ingredients'];
        unset($data['ingredients']);

        $recipe = $request->user()->recipes()->create([
            ...$data,
            'status' => 'pending',
        ]);
        $recipe->ingredients()->sync($this->ingredientQuantities($ingredients));

        return response()->json($recipe->load(['category', 'ingredients']), 201);
    }

    public function update(StoreRecipeRequest $request, Recipe $recipe): JsonResponse
    {
        abort_unless($request->user()->role === 'admin' || $request->user()->id === $recipe->user_id, 403);

        $data = $request->validated();
        $ingredients = $data['ingredients'];
        unset($data['ingredients']);
        $recipe->update([...$data, 'status' => 'pending']);
        $recipe->ingredients()->sync($this->ingredientQuantities($ingredients));

        return response()->json($recipe->load(['category', 'ingredients']));
    }

    public function destroy(Request $request, Recipe $recipe): JsonResponse
    {
        abort_unless($request->user()->role === 'admin' || $request->user()->id === $recipe->user_id, 403);
        $recipe->delete();

        return response()->json(status: 204);
    }

    public function moderate(Request $request, Recipe $recipe): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
        ]);
        $recipe->update(['status' => $data['status']]);

        return response()->json($recipe->load(['user:id,name', 'category:id,name,slug']));
    }

    private function ingredientQuantities(array $ingredients): array
    {
        $quantities = [];
        foreach ($ingredients as $ingredient) {
            $quantities[$ingredient['ingredient_id']] = ['quantity' => $ingredient['quantity']];
        }

        return $quantities;
    }
}
