<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AuthenticationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_student_can_register_and_use_a_personal_access_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Jamie Student',
            'email' => 'jamie@example.test',
            'password' => 'student-password',
            'password_confirmation' => 'student-password',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role', 'student')
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'role'], 'token']);

        $this->withToken($response->json('token'))
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.email', 'jamie@example.test');
    }

    public function test_a_user_can_log_in_and_revoke_the_current_token(): void
    {
        $user = User::factory()->create([
            'email' => 'student@example.test',
            'password' => 'student-password',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => 'student@example.test',
            'password' => 'student-password',
        ])->assertOk();

        $tokenId = explode('|', $login->json('token'), 2)[0];

        $this->withToken($login->json('token'))
            ->postJson('/api/logout')
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
        Auth::forgetGuards();
        $this->withToken($login->json('token'))
            ->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_registration_never_accepts_an_admin_role(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Malicious Student',
            'email' => 'new@example.test',
            'password' => 'student-password',
            'password_confirmation' => 'student-password',
            'role' => 'admin',
        ])->assertCreated()->assertJsonPath('user.role', 'student');
    }

    public function test_unauthenticated_api_requests_return_json_without_a_login_redirect(): void
    {
        $this->get('/api/dashboard')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }
}
