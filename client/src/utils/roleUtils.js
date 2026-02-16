/**
 * Returns the home page URL for a given user role.
 */
export function getHomeByRole(role) {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin";
    case "user":
    default:
      return "/user";
  }
}
