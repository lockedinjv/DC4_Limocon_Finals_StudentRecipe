<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'prep_time' => ['required', 'integer', 'min:1', 'max:1440'],
            'cook_time' => ['required', 'integer', 'min:0', 'max:1440'],
            'servings' => ['required', 'integer', 'min:1', 'max:100'],
            'budget_tier' => ['required', 'in:low,medium,high'],
            'instructions' => ['required', 'string', 'max:20000'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'ingredients' => ['required', 'array', 'min:1', 'max:40'],
            'ingredients.*.ingredient_id' => ['required', 'integer', 'distinct', 'exists:ingredients,id'],
            'ingredients.*.quantity' => ['required', 'string', 'max:80'],
        ];
    }
}
