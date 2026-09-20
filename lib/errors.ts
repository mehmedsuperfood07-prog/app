// Turns raw Postgres/PostgREST errors into something a person running the
// business can act on, instead of "duplicate key value violates unique
// constraint areas_name_key".
export function dbErrorMessage(error: { message: string; code?: string }): string {
  switch (error.code) {
    case "23505":
      return "That already exists.";
    case "23503":
      return "That is still linked to other records, so it can't be changed or removed.";
    case "42501":
      return "You don't have permission to do that.";
    case "22P02":
      return "One of the values isn't in the right format.";
    default:
      return error.message;
  }
}
