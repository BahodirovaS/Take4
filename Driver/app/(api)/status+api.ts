import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
    try {
        const sql = neon(`${process.env.DATABASE_URL}`);
        const requestData = await request.json();

        const { status, clerkId } = requestData;

        const existingUser = await sql`
            SELECT * FROM driver_info WHERE clerk_id = ${clerkId};
        `;

        if (existingUser.length > 0) {
            const response = await sql`
                UPDATE driver_info
                SET status = ${status}
                WHERE clerk_id = ${clerkId}
                RETURNING *;
            `;
            return Response.json({ data: response }, { status: 200 });
        } else {
            return Response.json({ error: "User not found" }, { status: 404 });
        }
    } catch (error) {
        console.error("Error updating driver status:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
