<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipe;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Recipe $recipe): JsonResponse
    {
        abort_unless($recipe->status === 'approved', 404);

        return response()->json($recipe->reviews()->with('user:id,name')->latest()->paginate(10));
    }

    public function store(Request $request, Recipe $recipe): JsonResponse
    {
        abort_unless($recipe->status === 'approved', 404);
        abort_if($recipe->user_id === $request->user()->id, 403, 'You cannot review your own recipe.');
        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);
        $data['comment'] = $data['comment'] ?? null;
        $review = Review::updateOrCreate(
            ['user_id' => $request->user()->id, 'recipe_id' => $recipe->id],
            $data,
        );

        return response()->json($review->load('user:id,name'), $review->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, Review $review): JsonResponse
    {
        abort_unless($request->user()->role === 'admin' || $request->user()->id === $review->user_id, 403);
        $review->delete();

        return response()->json(status: 204);
    }
}
