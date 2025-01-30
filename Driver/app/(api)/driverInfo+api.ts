import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
    try {
        const sql = neon(`${process.env.DATABASE_URL}`);
        const requestData = await request.json();

        const { phoneNumber, address, dob, licence, vMake, vPlate, vInsurance, pets, carSeats, clerkId } = requestData

        if (!phoneNumber || !address || !dob || !licence || !vMake || !vPlate || !vInsurance || !carSeats || !clerkId) {
            return Response.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        const existingUser = await sql`
            SELECT * FROM driver_info WHERE clerk_id = ${clerkId};
        `;
        let response;

        if (existingUser.length > 0) {

            response = await sql`
                UPDATE driver_info
                SET
                    phone_number = ${phoneNumber},
                    address = ${address},
                    dob = ${dob},
                    licence = ${licence},
                    v_make = ${vMake},
                    v_plate = ${vPlate},
                    v_insurance = ${vInsurance},
                    pets = ${pets},
                    car_seats = ${carSeats}
                WHERE clerk_id = ${clerkId}
                RETURNING *;
            `;
        } else {
            response = await sql`
                INSERT INTO driver_info (
                    phone_number,
                    address,
                    dob,
                    licence,
                    v_make,
                    v_plate,
                    v_insurance,
                    pets,
                    car_seats,
                    clerk_id
                )
                VALUES (
                    ${phoneNumber},
                    ${address},
                    ${dob},
                    ${licence},
                    ${vMake},
                    ${vPlate},
                    ${vInsurance},
                    ${pets},
                    ${carSeats},
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
