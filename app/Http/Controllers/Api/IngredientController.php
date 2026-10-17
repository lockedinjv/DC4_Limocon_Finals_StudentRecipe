<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ingredient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IngredientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Ingredient::query()->orderBy('name');

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->string('search')->toString().'%');
        }

        return response()->json($query->limit(100)->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', 'unique:ingredients,name'],
            'unit' => ['nullable', 'string', 'max:40'],
        ]);

        return response()->json(Ingredient::create($data), 201);
    }

    public function update(Request $request, Ingredient $ingredient): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', Rule::unique('ingredients', 'name')->ignore($ingredient->id)],
            'unit' => ['nullable', 'string', 'max:40'],
        ]);
        $ingredient->update($data);

        return response()->json($ingredient);
    }

    public function destroy(Ingredient $ingredient): JsonResponse
    {
        abort_if($ingredient->recipes()->exists(), 409, 'Remove this ingredient from recipes before deleting it.');
        $ingredient->delete();

        return response()->json(status: 204);
    }
}
