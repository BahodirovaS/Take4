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

        const existingDriverInfo = await sql`
            SELECT * FROM driver_info WHERE clerk_id = ${clerkId};
        `;
        let response;

        if (existingDriverInfo.length > 0) {
            const driver_id = existingDriverInfo[0].driver_id;
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
                WHERE driver_id = ${driver_id}
                RETURNING *;
            `;
        } else {
            const existingUser = await sql`
                SELECT driver_id FROM drivers WHERE clerk_id = ${clerkId};
            `;

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
        }

        return Response.json({ data: response }, { status: 201 });
    } catch (error) {
        console.error("Error updating driver info:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
