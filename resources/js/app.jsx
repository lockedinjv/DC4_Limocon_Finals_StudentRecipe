import React, { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('recipe-token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const ToastContext = createContext(() => {});
const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
    const [message, setMessage] = useState('');
    const toast = (text) => {
        setMessage(text);
        window.setTimeout(() => setMessage(''), 3200);
    };
    return (
        <ToastContext.Provider value={toast}>
            {children}
            {message && <div className="toast" role="status">{message}</div>}
        </ToastContext.Provider>
    );
}

function App() {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (!localStorage.getItem('recipe-token')) {
            setReady(true);
            return;
        }
        api.get('/user')
            .then(({ data }) => setUser(data.user))
            .catch(() => localStorage.removeItem('recipe-token'))
            .finally(() => setReady(true));
    }, []);

    async function logout() {
        try {
            await api.post('/logout');
        } catch (error) {
            toast(error.response?.data?.message || 'Could not log out. Please try again.');
            return;
        }
        localStorage.removeItem('recipe-token');
        setUser(null);
        toast('You are signed out.');
    }

    if (!ready) return <div className="page-loading">Getting your kitchen ready…</div>;

    return (
        <BrowserRouter>
            <div className="app-shell">
                <Header user={user} onLogout={logout} />
                <main>
                    <Routes>
                        <Route path="/" element={<Catalog user={user} />} />
                        <Route path="/recipes/:id" element={<RecipeDetails user={user} />} />
                        <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" onLogin={setUser} />} />
                        <Route path="/register" element={user ? <Navigate to="/" replace /> : <AuthPage mode="register" onLogin={setUser} />} />
                        <Route element={user ? <Outlet /> : <Navigate to="/login" replace />}>
                            <Route path="/dashboard" element={<Dashboard user={user} />} />
                            <Route path="/favorites" element={<Favorites />} />
                            <Route path="/my-recipes" element={<MyRecipes />} />
                            <Route path="/submit" element={<SubmitRecipe />} />
                            <Route path="/recipes/:id/edit" element={<SubmitRecipe />} />
                            <Route path="/admin" element={user?.role === 'admin' ? <Moderation /> : <Navigate to="/" replace />} />
                            <Route path="/admin/content" element={user?.role === 'admin' ? <ContentManagement /> : <Navigate to="/" replace />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
                <footer>Made for student kitchens <span>·</span> Mater Dei College</footer>
            </div>
        </BrowserRouter>
    );
}

function Header({ user, onLogout }) {
    return (
        <header className="site-header">
            <Link className="brand" to="/">
                <span className="brand-mark">pp</span>
                <span>pantry<span className="brand-light">pal</span><small>student recipe collection</small></span>
            </Link>
            <nav aria-label="Main navigation">
                <Link to="/">Explore</Link>
                {user && <Link to="/dashboard">My kitchen</Link>}
                {user && <Link to="/favorites">Saved</Link>}
                {user && <Link to="/my-recipes">My recipes</Link>}
                {user && <Link to="/submit" className="nav-submit">＋ Share a recipe</Link>}
                {user?.role === 'admin' && <Link to="/admin">Review queue</Link>}
                {user?.role === 'admin' && <Link to="/admin/content">Manage lists</Link>}
            </nav>
            <div className="account-actions">
                {user ? (
                    <>
                        <span className="user-greeting">Hi, {user.name.split(' ')[0]}</span>
                        <button className="button button-quiet button-small" onClick={onLogout}>Sign out</button>
                    </>
                ) : (
                    <>
                        <Link className="sign-in" to="/login">Sign in</Link>
                        <Link className="button button-small" to="/register">Join free</Link>
                    </>
                )}
            </div>
        </header>
    );
}

function Catalog({ user }) {
    const toast = useToast();
    const [recipes, setRecipes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [filters, setFilters] = useState({ search: '', category: '', budget_tier: '', max_prep_time: '', ingredient_ids: '' });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.get('/categories'), api.get('/ingredients')])
            .then(([categoryResponse, ingredientResponse]) => {
                setCategories(categoryResponse.data);
                setIngredients(ingredientResponse.data);
            })
            .catch(() => toast('Could not load recipe filters.'));
    }, []);

    useEffect(() => {
        setLoading(true);
        api.get('/recipes', { params: { ...filters, page } })
            .then(({ data }) => {
                setRecipes(data.data);
                setPagination(data);
            })
            .catch(() => toast('Could not load recipes. Please refresh the page.'))
            .finally(() => setLoading(false));
    }, [filters, page]);

    function updateFilter(name, value) {
        setFilters((current) => ({ ...current, [name]: value }));
        setPage(1);
    }

    return (
        <section className="content-width">
            <div className="hero">
                <div className="hero-copy">
                    <div className="eyebrow"><span className="eyebrow-dot" /> GOOD FOOD, ON A STUDENT BUDGET</div>
                    <h1>Your next favorite<br /><em>meal starts here.</em></h1>
                    <p>Real recipes from the Mater Dei community. Easy to make, kind to your wallet, and better shared.</p>
                    <div className="hero-note"><span>✳</span> Cook something good today.</div>
                </div>
                <div className="hero-art" aria-hidden="true">
                    <div className="art-circle"><span>🥑</span></div>
                    <div className="art-leaf leaf-one">⌁</div>
                    <div className="art-leaf leaf-two">⌁</div>
                    <span className="art-spark spark-one">✳</span>
                    <span className="art-spark spark-two">✳</span>
                    <div className="art-label">fresh ideas<br />for hungry minds</div>
                </div>
            </div>
            <div className="section-heading">
                <div><div className="eyebrow">THE COMMUNITY TABLE</div><h2>Find your next meal</h2></div>
                <span className="recipe-total">{pagination?.total ?? 0} recipes to explore</span>
            </div>
            <div className="filters">
                <label className="search-field"><span>⌕</span><input aria-label="Search recipes" placeholder="Search meals or ingredients…" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} /></label>
                <select aria-label="Filter by category" value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
                    <option value="">All categories</option>
                    {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                </select>
                <select aria-label="Filter by budget" value={filters.budget_tier} onChange={(event) => updateFilter('budget_tier', event.target.value)}>
                    <option value="">Any budget</option><option value="low">Budget friendly</option><option value="medium">Mid-range</option><option value="high">A little extra</option>
                </select>
                <select aria-label="Filter by prep time" value={filters.max_prep_time} onChange={(event) => updateFilter('max_prep_time', event.target.value)}>
                    <option value="">Any prep time</option><option value="15">Under 15 min</option><option value="30">Under 30 min</option><option value="45">Under 45 min</option>
                </select>
                <select aria-label="Filter by available ingredient" value={filters.ingredient_ids} onChange={(event) => updateFilter('ingredient_ids', event.target.value)}>
                    <option value="">Any ingredient</option>{ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
                </select>
            </div>
            {loading ? <div className="empty-state">Finding something delicious…</div> : recipes.length ? (
                <>
                    <div className="recipe-grid">{recipes.map((recipe, index) => <RecipeCard key={recipe.id} recipe={recipe} user={user} index={index} />)}</div>
                    <Pagination pagination={pagination} onPage={setPage} />
                </>
            ) : (
                <div className="empty-state"><span>🥣</span><h3>No recipes found just yet</h3><p>Try another search, or be the first to share a dish with the community.</p></div>
            )}
        </section>
    );
}

function RecipeCard({ recipe, user, index = 0, initialSaved = false }) {
    const toast = useToast();
    const [saved, setSaved] = useState(initialSaved);
    const [saving, setSaving] = useState(false);
    const colors = ['card-peach', 'card-mint', 'card-lilac', 'card-yellow'];
    async function toggleFavorite(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!user) return toast('Sign in to save recipes to your kitchen.');
        setSaving(true);
        try {
            if (saved) await api.delete(`/favorites/${recipe.id}`);
            else await api.post('/favorites', { recipe_id: recipe.id });
            setSaved(!saved);
            toast(saved ? 'Removed from your saved recipes.' : 'Recipe saved to your kitchen.');
        } catch (error) {
            toast(error.response?.data?.message || 'Could not update your saved recipes.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <article className="recipe-card">
            <Link to={`/recipes/${recipe.id}`} className="recipe-card-link">
                <div className={`recipe-art ${colors[index % colors.length]}`}>
                    {recipe.image_url ? <img src={recipe.image_url} alt="" /> : <span>{recipe.category?.name === 'Breakfast' ? '🍳' : recipe.category?.name === 'Snacks' ? '🥪' : '🍲'}</span>}
                    <span className="category-pill">{recipe.category?.name || 'Community recipe'}</span>
                </div>
                <div className="recipe-card-body">
                    <div className="recipe-meta">{recipe.prep_time} MIN PREP <span>·</span> {recipe.budget_tier} budget</div>
                    <h3>{recipe.title}</h3>
                    <p>{recipe.description || 'A tried-and-loved recipe shared by a student cook.'}</p>
                    <div className="card-byline"><span className="avatar">{recipe.user?.name?.[0] || 'S'}</span><span>by {recipe.user?.name || 'Student chef'}</span><span className="rating">★ {Number(recipe.reviews_avg_rating || 0).toFixed(1)}</span></div>
                </div>
            </Link>
            <button className={`save-button ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Remove saved recipe' : 'Save recipe'} disabled={saving} onClick={toggleFavorite}>{saved ? '♥' : '♡'}</button>
        </article>
    );
}

function Pagination({ pagination, onPage }) {
    if (!pagination || pagination.last_page <= 1) return null;
    return <div className="pagination"><button className="button button-quiet" disabled={!pagination.prev_page_url} onClick={() => onPage(pagination.current_page - 1)}>← Previous</button><span>Page {pagination.current_page} of {pagination.last_page}</span><button className="button button-quiet" disabled={!pagination.next_page_url} onClick={() => onPage(pagination.current_page + 1)}>Next →</button></div>;
}

function AuthPage({ mode, onLogin }) {
    const toast = useToast();
    const navigate = useNavigate();
    const registering = mode === 'register';
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState({});

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        const form = new FormData(event.currentTarget);
        const payload = Object.fromEntries(form.entries());
        try {
            const { data } = await api.post(registering ? '/register' : '/login', payload);
            localStorage.setItem('recipe-token', data.token);
            onLogin(data.user);
            toast(registering ? 'Welcome to the community kitchen!' : 'Welcome back!');
            navigate('/dashboard');
        } catch (error) {
            if (error.response?.status === 422) setErrors(error.response.data.errors || {});
            else toast(error.response?.data?.message || 'We could not sign you in. Try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="auth-layout">
            <div className="auth-aside"><div className="eyebrow">A LITTLE INSPIRATION GOES A LONG WAY</div><h1>Good food is<br /><em>better together.</em></h1><p>Save your favorites, share your own recipes, and make student life a little tastier.</p><span className="auth-emoji">🍋</span></div>
            <form className="auth-card" onSubmit={submit}>
                <div className="eyebrow">{registering ? 'YOUR COMMUNITY KITCHEN' : 'NICE TO SEE YOU AGAIN'}</div>
                <h2>{registering ? 'Create your account' : 'Welcome back'}</h2>
                <p>{registering ? 'Join the table and share a meal.' : 'Sign in to get back to your recipes.'}</p>
                {registering && <Field label="Your name" name="name" errors={errors} />}
                <Field label="Email address" name="email" type="email" errors={errors} />
                <Field label="Password" name="password" type="password" errors={errors} />
                {registering && <Field label="Confirm password" name="password_confirmation" type="password" errors={errors} />}
                <button className="button button-wide" disabled={busy}>{busy ? 'One moment…' : registering ? 'Create account' : 'Sign in'}</button>
                <div className="auth-switch">{registering ? 'Already part of the table?' : 'New around here?'} <Link to={registering ? '/login' : '/register'}>{registering ? 'Sign in' : 'Join the community'}</Link></div>
            </form>
        </section>
    );
}

function Field({ label, name, type = 'text', errors, defaultValue, required = true }) {
    return <label className="form-field"><span>{label}</span><input required={required} name={name} type={type} defaultValue={defaultValue} autoComplete={name.includes('password') ? name : undefined} />{errors[name]?.map((error) => <small className="field-error" key={error}>{error}</small>)}</label>;
}

function Dashboard({ user }) {
    const toast = useToast();
    const [dashboard, setDashboard] = useState(null);
    useEffect(() => {
        api.get('/dashboard').then(({ data }) => setDashboard(data)).catch(() => toast('Could not load your dashboard.'));
    }, []);
    if (!dashboard) return <div className="empty-state">Setting your table…</div>;
    return (
        <section className="content-width subpage">
            <div className="section-heading"><div><div className="eyebrow">YOUR LITTLE CORNER OF THE KITCHEN</div><h2>Welcome back, {user.name.split(' ')[0]}</h2></div><Link to="/submit" className="button">＋ Share a recipe</Link></div>
            <div className="stats-grid">
                <Stat number={dashboard.stats.saved_recipes} label="Recipes saved" icon="♡" />
                <Stat number={dashboard.stats.recipes_contributed} label="Recipes shared" icon="✳" />
                <Stat number={dashboard.stats.reviews_written} label="Reviews written" icon="★" />
                {user.role === 'admin' && <Stat number={dashboard.stats.pending_reviews} label="Waiting for review" icon="◷" />}
            </div>
            {user.role === 'admin' && <Link to="/admin" className="admin-banner">You have {dashboard.stats.pending_reviews} recipes waiting for moderation <span>Review queue →</span></Link>}
            {dashboard.my_recent_recipes.length > 0 && <><h3 className="subheading">Your recent submissions</h3><div className="submission-list">{dashboard.my_recent_recipes.map((recipe) => <div className="submission-row" key={recipe.id}><div><strong>{recipe.title}</strong><span>{recipe.category?.name} · {recipe.prep_time} min prep</span></div><span className={`status-pill status-${recipe.status}`}>{recipe.status === 'approved' ? 'Published' : recipe.status === 'rejected' ? 'Needs changes' : 'Pending review'}</span></div>)}</div></>}
            <h3 className="subheading">Recently shared</h3>
            <div className="recipe-grid">{dashboard.recent_recipes.map((recipe, index) => <RecipeCard key={recipe.id} recipe={recipe} user={user} index={index} />)}</div>
            <h3 className="subheading">Community favorites</h3>
            <div className="recipe-grid">{dashboard.trending_recipes.map((recipe, index) => <RecipeCard key={recipe.id} recipe={recipe} user={user} index={index} />)}</div>
        </section>
    );
}

function Stat({ number, label, icon }) {
    return <div className="stat-card"><span>{icon}</span><strong>{number}</strong><small>{label}</small></div>;
}

function Favorites() {
    const toast = useToast();
    const [favorites, setFavorites] = useState([]);
    useEffect(() => {
        api.get('/favorites').then(({ data }) => setFavorites(data.data)).catch(() => toast('Could not load saved recipes.'));
    }, []);
    return <section className="content-width subpage"><div className="section-heading"><div><div className="eyebrow">YOUR PERSONAL COLLECTION</div><h2>Saved for later</h2></div></div>{favorites.length ? <div className="recipe-grid">{favorites.map((favorite, index) => <RecipeCard key={favorite.id} recipe={favorite.recipe} index={index} user initialSaved />)}</div> : <div className="empty-state"><span>♡</span><h3>Your collection is waiting</h3><p>Save recipes you love and they’ll be right here when you need them.</p><Link className="button" to="/">Explore recipes</Link></div>}</section>;
}

function MyRecipes() {
    const toast = useToast();
    const navigate = useNavigate();
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);

    async function load() {
        try {
            const { data } = await api.get('/my-recipes');
            setRecipes(data.data);
        } catch {
            toast('Could not load your submissions.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    async function remove(recipe) {
        if (!window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/recipes/${recipe.id}`);
            setRecipes((current) => current.filter((item) => item.id !== recipe.id));
            toast('Recipe deleted.');
        } catch (error) {
            toast(error.response?.data?.message || 'Could not delete this recipe.');
        }
    }

    return <section className="content-width subpage">
        <div className="section-heading"><div><div className="eyebrow">RECIPES YOU’VE SHARED</div><h2>My submissions</h2></div><Link to="/submit" className="button">＋ Share a recipe</Link></div>
        {loading ? <div className="empty-state">Loading your recipes…</div> : recipes.length ? <div className="submission-list">{recipes.map((recipe) => <div className="submission-row" key={recipe.id}><div><strong>{recipe.title}</strong><span>{recipe.category?.name} · {recipe.prep_time} min prep · {recipe.reviews_count} reviews</span></div><div className="submission-controls"><span className={`status-pill status-${recipe.status}`}>{recipe.status === 'approved' ? 'Published' : recipe.status === 'rejected' ? 'Needs changes' : 'Pending review'}</span><button className="text-button" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>Edit</button><button className="text-button text-danger" onClick={() => remove(recipe)}>Delete</button></div></div>)}</div> : <div className="empty-state"><span>✳</span><h3>Your recipes belong here</h3><p>Share a tried-and-loved meal with your campus community.</p><Link className="button" to="/submit">Share your first recipe</Link></div>}
    </section>;
}

function SubmitRecipe() {
    const toast = useToast();
    const navigate = useNavigate();
    const { id } = useParams();
    const [categories, setCategories] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [existing, setExisting] = useState(null);
    const [formLoaded, setFormLoaded] = useState(!id);
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState({});
    const [rows, setRows] = useState([{ ingredient_id: '', quantity: '' }]);

    useEffect(() => {
        Promise.all([api.get('/categories'), api.get('/ingredients'), id ? api.get(`/recipes/${id}`) : Promise.resolve(null)])
            .then(([categoryResponse, ingredientResponse, recipeResponse]) => {
                setCategories(categoryResponse.data);
                setIngredients(ingredientResponse.data);
                if (recipeResponse) {
                    setExisting(recipeResponse.data);
                    setRows(recipeResponse.data.ingredients.map((ingredient) => ({
                        ingredient_id: String(ingredient.id),
                        quantity: ingredient.pivot.quantity,
                    })));
                }
            })
            .catch(() => toast('Could not load recipe form options.'))
            .finally(() => setFormLoaded(true));
    }, [id]);

    function updateRow(index, field, value) {
        setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    }

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        const form = new FormData(event.currentTarget);
        const payload = Object.fromEntries(form.entries());
        payload.category_id = Number(payload.category_id);
        payload.prep_time = Number(payload.prep_time);
        payload.cook_time = Number(payload.cook_time);
        payload.servings = Number(payload.servings);
        payload.ingredients = rows.filter((row) => row.ingredient_id && row.quantity).map((row) => ({ ingredient_id: Number(row.ingredient_id), quantity: row.quantity }));
        try {
            if (id) await api.put(`/recipes/${id}`, payload);
            else await api.post('/recipes', payload);
            toast(id ? 'Recipe updated and sent for review.' : 'Recipe submitted! It will appear after a moderator approves it.');
            navigate('/my-recipes');
        } catch (error) {
            if (error.response?.status === 422) setErrors(error.response.data.errors || {});
            else toast(error.response?.data?.message || 'Your recipe could not be submitted.');
        } finally {
            setBusy(false);
        }
    }

    if (!formLoaded) return <div className="empty-state">Loading your recipe…</div>;

    return (
        <section className="content-width subpage narrow-page">
            <div className="eyebrow">{id ? 'MAKE A FEW CHANGES' : 'PASS A GOOD THING ALONG'}</div><h2>{id ? 'Update your recipe' : 'Share your recipe'}</h2><p className="form-intro">Recipes are reviewed before they appear in the community collection.</p>
            <form className="recipe-form" onSubmit={submit}>
                <div className="form-two"><Field label="Recipe name" name="title" defaultValue={existing?.title} errors={errors} /><label className="form-field"><span>Category</span><select required key={categories.length} name="category_id" defaultValue={existing?.category_id || ''}><option value="">Choose one</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.category_id?.map((error) => <small className="field-error" key={error}>{error}</small>)}</label></div>
                <label className="form-field"><span>A short description</span><textarea name="description" rows="2" defaultValue={existing?.description || ''} placeholder="What makes this one special?" />{errors.description?.map((error) => <small className="field-error" key={error}>{error}</small>)}</label>
                <div className="form-three">
                    <Field label="Prep time (minutes)" name="prep_time" type="number" defaultValue={existing?.prep_time} errors={errors} />
                    <Field label="Cook time (minutes)" name="cook_time" type="number" defaultValue={existing?.cook_time} errors={errors} />
                    <Field label="Servings" name="servings" type="number" defaultValue={existing?.servings} errors={errors} />
                </div>
                <label className="form-field"><span>Budget tier</span><select name="budget_tier" required defaultValue={existing?.budget_tier || 'low'}><option value="low">Budget friendly</option><option value="medium">Mid-range</option><option value="high">A little extra</option></select></label>
                <div className="form-field"><span>Ingredients</span>{rows.map((row, index) => <div className="ingredient-row" key={index}>
                    <select required value={row.ingredient_id} onChange={(event) => updateRow(index, 'ingredient_id', event.target.value)}><option value="">Choose an ingredient</option>{ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}{ingredient.unit ? ` (${ingredient.unit})` : ''}</option>)}</select>
                    <input required aria-label="Ingredient quantity" placeholder="e.g. 2 cups" value={row.quantity} onChange={(event) => updateRow(index, 'quantity', event.target.value)} />
                    {rows.length > 1 && <button type="button" className="remove-row" aria-label="Remove ingredient" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>×</button>}
                </div>)}<button type="button" className="text-button" onClick={() => setRows((current) => [...current, { ingredient_id: '', quantity: '' }])}>＋ Add another ingredient</button>{errors.ingredients?.map((error) => <small className="field-error" key={error}>{error}</small>)}</div>
                <label className="form-field"><span>Cooking instructions</span><textarea required name="instructions" rows="6" defaultValue={existing?.instructions || ''} placeholder="Walk us through it, one step at a time." />{errors.instructions?.map((error) => <small className="field-error" key={error}>{error}</small>)}</label>
                <Field label="Image URL (optional)" name="image_url" type="url" required={false} defaultValue={existing?.image_url || ''} errors={errors} />
                <button className="button" disabled={busy || (id && !existing)}>{busy ? 'Sending to the kitchen…' : id ? 'Save changes for review' : 'Submit for review'}</button>
            </form>
        </section>
    );
}

function Moderation() {
    const toast = useToast();
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get('/recipes', { params: { per_page: 30 } });
            setRecipes(data.data.filter((recipe) => recipe.status === 'pending'));
        } catch {
            toast('Could not load the moderation queue.');
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);
    async function moderate(recipe, status) {
        try {
            await api.patch(`/recipes/${recipe.id}/moderation`, { status });
            toast(status === 'approved' ? 'Recipe published.' : 'Recipe rejected.');
            setRecipes((current) => current.filter((item) => item.id !== recipe.id));
        } catch (error) {
            toast(error.response?.data?.message || 'Could not update this recipe.');
        }
    }
    return <section className="content-width subpage"><div className="eyebrow">KEEPING THE TABLE SAFE AND DELICIOUS</div><h2>Recipe review queue</h2>{loading ? <div className="empty-state">Loading submissions…</div> : recipes.length ? <div className="moderation-list">{recipes.map((recipe) => <article className="moderation-card" key={recipe.id}><div><div className="recipe-meta">{recipe.category?.name} · by {recipe.user?.name}</div><h3>{recipe.title}</h3><p>{recipe.description || recipe.instructions}</p><div className="recipe-meta">{recipe.prep_time} min prep · {recipe.budget_tier} budget</div></div><div className="moderation-actions"><button className="button" onClick={() => moderate(recipe, 'approved')}>Approve</button><button className="button button-danger" onClick={() => moderate(recipe, 'rejected')}>Reject</button></div></article>)}</div> : <div className="empty-state"><span>✓</span><h3>All caught up!</h3><p>There are no recipes waiting for review.</p></div>}</section>;
}

function ContentManagement() {
    const toast = useToast();
    const [categories, setCategories] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [ingredientForm, setIngredientForm] = useState({ name: '', unit: '' });
    const [editingIngredient, setEditingIngredient] = useState(null);

    async function load() {
        try {
            const [categoryResponse, ingredientResponse] = await Promise.all([api.get('/categories'), api.get('/ingredients')]);
            setCategories(categoryResponse.data);
            setIngredients(ingredientResponse.data);
        } catch {
            toast('Could not load categories and ingredients.');
        }
    }

    useEffect(() => { load(); }, []);

    async function saveCategory(event) {
        event.preventDefault();
        try {
            if (editingCategory) await api.put(`/categories/${editingCategory.id}`, { name: categoryName });
            else await api.post('/categories', { name: categoryName });
            setCategoryName('');
            setEditingCategory(null);
            toast(editingCategory ? 'Category updated.' : 'Category added.');
            await load();
        } catch (error) {
            toast(error.response?.data?.message || error.response?.data?.errors?.name?.[0] || 'Could not save category.');
        }
    }

    async function removeCategory(category) {
        try {
            await api.delete(`/categories/${category.id}`);
            toast('Category deleted.');
            await load();
        } catch (error) {
            toast(error.response?.data?.message || 'Could not delete category.');
        }
    }

    async function saveIngredient(event) {
        event.preventDefault();
        try {
            if (editingIngredient) await api.put(`/ingredients/${editingIngredient.id}`, ingredientForm);
            else await api.post('/ingredients', ingredientForm);
            setIngredientForm({ name: '', unit: '' });
            setEditingIngredient(null);
            toast(editingIngredient ? 'Ingredient updated.' : 'Ingredient added.');
            await load();
        } catch (error) {
            toast(error.response?.data?.message || error.response?.data?.errors?.name?.[0] || 'Could not save ingredient.');
        }
    }

    async function removeIngredient(ingredient) {
        try {
            await api.delete(`/ingredients/${ingredient.id}`);
            toast('Ingredient deleted.');
            await load();
        } catch (error) {
            toast(error.response?.data?.message || 'Could not delete ingredient.');
        }
    }

    return <section className="content-width subpage">
        <div className="eyebrow">KEEPING RECIPE OPTIONS ORGANIZED</div><h2>Categories & ingredients</h2>
        <div className="management-grid">
            <section className="management-card"><h3>Categories</h3><form className="management-form" onSubmit={saveCategory}><input required maxLength="100" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" /><button className="button button-small">{editingCategory ? 'Save changes' : 'Add category'}</button>{editingCategory && <button type="button" className="text-button" onClick={() => { setEditingCategory(null); setCategoryName(''); }}>Cancel edit</button>}</form><div className="management-list">{categories.map((category) => <div className="management-row" key={category.id}><span>{category.name}</span><div><button className="text-button" onClick={() => { setEditingCategory(category); setCategoryName(category.name); }}>Edit</button><button className="text-button text-danger" onClick={() => removeCategory(category)}>Delete</button></div></div>)}</div></section>
            <section className="management-card"><h3>Ingredients</h3><form className="management-form" onSubmit={saveIngredient}><input required maxLength="120" value={ingredientForm.name} onChange={(event) => setIngredientForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ingredient name" /><input maxLength="40" value={ingredientForm.unit} onChange={(event) => setIngredientForm((current) => ({ ...current, unit: event.target.value }))} placeholder="Default unit (optional)" /><button className="button button-small">{editingIngredient ? 'Save changes' : 'Add ingredient'}</button>{editingIngredient && <button type="button" className="text-button" onClick={() => { setEditingIngredient(null); setIngredientForm({ name: '', unit: '' }); }}>Cancel edit</button>}</form><div className="management-list">{ingredients.map((ingredient) => <div className="management-row" key={ingredient.id}><span>{ingredient.name}{ingredient.unit ? ` · ${ingredient.unit}` : ''}</span><div><button className="text-button" onClick={() => { setEditingIngredient(ingredient); setIngredientForm({ name: ingredient.name, unit: ingredient.unit || '' }); }}>Edit</button><button className="text-button text-danger" onClick={() => removeIngredient(ingredient)}>Delete</button></div></div>)}</div></section>
        </div>
    </section>;
}

function RecipeDetails({ user }) {
    const { id } = useParams();
    const toast = useToast();
    const [recipe, setRecipe] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    async function load() {
        try {
            const [recipeResponse, reviewResponse] = await Promise.all([api.get(`/recipes/${id}`), api.get(`/recipes/${id}/reviews`)]);
            setRecipe(recipeResponse.data);
            setReviews(reviewResponse.data.data);
            const ownReview = reviewResponse.data.data.find((item) => item.user_id === user?.id);
            if (ownReview) {
                setRating(ownReview.rating);
                setComment(ownReview.comment || '');
            }
        } catch {
            toast('This recipe could not be found.');
        }
    }
    useEffect(() => { load(); }, [id, user?.id]);
    async function review(event) {
        event.preventDefault();
        if (!user) return toast('Sign in to leave a review.');
        setSubmitting(true);
        try {
            await api.post(`/recipes/${id}/reviews`, { rating, comment });
            setComment('');
            toast('Thanks for sharing your thoughts!');
            await load();
        } catch (error) {
            toast(error.response?.data?.message || error.response?.data?.errors?.rating?.[0] || 'Could not submit your review.');
        } finally {
            setSubmitting(false);
        }
    }
    async function removeReview(item) {
        try {
            await api.delete(`/reviews/${item.id}`);
            toast('Review deleted.');
            await load();
        } catch (error) {
            toast(error.response?.data?.message || 'Could not delete this review.');
        }
    }
    if (!recipe) return <div className="empty-state">Bringing up the recipe…</div>;
    return <section className="content-width subpage narrow-page">
        <Link to="/" className="back-link">← Back to recipes</Link>
        <div className="eyebrow">{recipe.category?.name} · {recipe.budget_tier} BUDGET</div><h1 className="detail-title">{recipe.title}</h1>
        <p className="detail-description">{recipe.description}</p>
        <div className="detail-facts"><span>◷ {recipe.prep_time} min prep</span><span>♨ {recipe.cook_time} min cook</span><span>♧ Serves {recipe.servings}</span><span>★ {Number(recipe.reviews_avg_rating || 0).toFixed(1)} ({recipe.reviews_count} reviews)</span></div>
        <div className="detail-columns"><div><h3>Ingredients</h3><ul className="ingredient-list">{recipe.ingredients.map((ingredient) => <li key={ingredient.id}><span>{ingredient.name}</span><strong>{ingredient.pivot.quantity}</strong></li>)}</ul></div><div><h3>Let's make it</h3><p className="instructions">{recipe.instructions}</p></div></div>
        <div className="review-section"><h3>Community notes</h3>{reviews.map((item) => <article className="review-card" key={item.id}><div><strong>{item.user?.name}</strong><span className="rating"> { '★'.repeat(item.rating)}</span>{user && (user.id === item.user_id || user.role === 'admin') && <button className="text-button text-danger" onClick={() => removeReview(item)}>Delete</button>}</div><p>{item.comment || 'Made this recipe and loved it.'}</p></article>)}{user && user.id !== recipe.user_id ? <form className="review-form" onSubmit={review}><h4>Made it? Leave a note.</h4><label className="form-field"><span>Your rating</span><select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} {value === 1 ? 'star' : 'stars'}</option>)}</select></label><label className="form-field"><span>Your review</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows="3" maxLength="2000" placeholder="How did it go?" /></label><button className="button" disabled={submitting}>{submitting ? 'Posting…' : reviews.some((item) => item.user_id === user.id) ? 'Update review' : 'Post review'}</button></form> : !user && <p><Link to="/login">Sign in</Link> to leave a review.</p>}</div>
    </section>;
}

createRoot(document.getElementById('app')).render(<React.StrictMode><ToastProvider><App /></ToastProvider></React.StrictMode>);
