import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
    try {
        const sql = neon(`${process.env.DATABASE_URL}`);
        const response = await sql`SELECT * FROM user_phones`;

        return Response.json({ data: response });
    } catch (error) {
        console.error("Error fetching phone numbers:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
