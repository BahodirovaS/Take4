import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
    try {
        const sql = neon(`${process.env.DATABASE_URL}`);
        const requestData = await request.json();

        const { phoneNumber, clerkId } = requestData

        if (!phoneNumber || !clerkId) {
            return Response.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        const existingUser = await sql`
            SELECT * FROM user_phones WHERE clerk_id = ${clerkId};
        `;
        let response;

        if (existingUser.length > 0) {

            response = await sql`
                UPDATE user_phones
                SET
                    phone_number = ${phoneNumber}
                WHERE clerk_id = ${clerkId}
                RETURNING *;
            `;
        } else {
            response = await sql`
                INSERT INTO user_phones (
                    phone_number,
                    clerk_id
                )
                VALUES (
                    ${phoneNumber},
                    ${clerkId}
                )
                RETURNING *;
            `;
        }

        return Response.json({ data: response }, { status: 201 });
    } catch (error) {
        console.error("Error updating driver info:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
