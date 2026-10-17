<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $favorites = $request->user()->favorites()
            ->with(['recipe.user:id,name', 'recipe.category:id,name,slug', 'recipe.ingredients:id,name,unit'])
            ->latest()
            ->paginate(12);

        return response()->json($favorites);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'recipe_id' => ['required', 'integer', 'exists:recipes,id'],
        ]);
        $recipe = Recipe::findOrFail($data['recipe_id']);
        abort_unless($recipe->status === 'approved', 404);

        $favorite = Favorite::firstOrCreate([
            'user_id' => $request->user()->id,
            'recipe_id' => $recipe->id,
        ]);

        return response()->json($favorite->load('recipe'), $favorite->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, Recipe $recipe): JsonResponse
    {
        $request->user()->favorites()->where('recipe_id', $recipe->id)->delete();

        return response()->json(status: 204);
    }
}
