export const prerender = false;
export const POST: APIRoute = ({ request }) => {
  return new Response(
    JSON.stringify({
      message: "test",
    }),
  );
};
