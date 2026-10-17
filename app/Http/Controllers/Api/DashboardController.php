<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $recent = Recipe::query()
            ->where('status', 'approved')
            ->with(['user:id,name', 'category:id,name,slug'])
            ->latest()
            ->limit(5)
            ->get();
        $trending = Recipe::query()
            ->where('status', 'approved')
            ->with(['user:id,name', 'category:id,name,slug'])
            ->withCount('favorites')
            ->orderByDesc('favorites_count')
            ->limit(5)
            ->get();
        $myRecentRecipes = $user->recipes()
            ->with('category:id,name,slug')
            ->latest()
            ->limit(5)
            ->get();

        return response()->json([
            'stats' => [
                'saved_recipes' => $user->favorites()->count(),
                'recipes_contributed' => $user->recipes()->count(),
                'reviews_written' => $user->reviews()->count(),
                'pending_reviews' => $user->role === 'admin'
                    ? Recipe::where('status', 'pending')->count()
                    : null,
            ],
            'recent_recipes' => $recent,
            'my_recent_recipes' => $myRecentRecipes,
            'trending_recipes' => $trending,
        ]);
    }
}
