import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
    try {
        const sql = neon(`${process.env.DATABASE_URL}`);
        const requestData = await request.json();

        const { phoneNumber, address, dob, licence, vMake, vPlate, vInsurance, pets, carSeats, clerkId } = requestData;

        if (!phoneNumber || !address || !dob || !licence || !vMake || !vPlate || !vInsurance || !carSeats || !clerkId) {
            return Response.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        const existingUser = await sql`
            SELECT driver_id FROM drivers WHERE clerk_id = ${clerkId};
        `;
        let response;

        if (existingUser.length > 0) {
            const driver_id = existingUser[0].driver_id;

            response = await sql`
                INSERT INTO driver_info (
                    driver_id,
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
                    ${driver_id},
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
        } else {
            const driverInsertResponse = await sql`
                INSERT INTO drivers (clerk_id)
                VALUES (${clerkId})
                RETURNING driver_id;
            `;

            const driver_id = driverInsertResponse[0].driver_id;

            response = await sql`
                INSERT INTO driver_info (
                    driver_id,
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
                    ${driver_id},
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
