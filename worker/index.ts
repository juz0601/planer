export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: `${env.My_Name}`,
      });
    }
		return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
