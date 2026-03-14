// AssistantNet — Simple Hash-based Router

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.onRouteChange = null;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    window.location.hash = path;
  }

  handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    const path = hash.replace('#', '');

    if (this.routes[path]) {
      this.currentRoute = path;
      this.routes[path]();
      if (this.onRouteChange) this.onRouteChange(path);
    } else {
      // Unknown route — redirect to dashboard
      this.navigate('/dashboard');
    }
  }

  getCurrentRoute() {
    return this.currentRoute || '/dashboard';
  }

  start() {
    this.handleRoute();
  }
}

export const router = new Router();
export default router;
