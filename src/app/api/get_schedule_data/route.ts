import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import cheerio from "cheerio";
import getRealGrade from "@/utils/getRealGrade";
import { Period } from "@/types";

function getScheduleWithLunch(schedule: Period[]) {
	const length = schedule.length;
	var lunchPeriod;
	const lunchBlock = schedule[schedule.length - 1];

	if ((lunchBlock.room[1] === "1" || lunchBlock.room[1] === "2" || lunchBlock.room[1] === "3" || lunchBlock.room[1] === "4") && (lunchBlock.room[0] === "4" || lunchBlock.room[0] === "5")) {
		lunchPeriod = 3;
	} else if (lunchBlock.name.includes("Physics")) {
		lunchPeriod = 3;
	} else if (lunchBlock.room.startsWith("WM")) {
		lunchPeriod = 3;
	} else if (lunchBlock.room[0] === "2" && !lunchBlock.name.includes("Physics")) {
		lunchPeriod = 1;
	}
}

export async function GET(req: NextRequest, res: NextResponse) {
	try {
		const sessionId = cookies().get("sessionId")?.value;

		const startTime = new Date();

		var apacheToken;

		const schedule = await fetch(
			`https://aspen.cpsd.us/aspen/studentScheduleContextList.do?navkey=myInfo.sch.list`,
			{
				headers: {
					Cookie: `JSESSIONID=${sessionId}`,
				},
			},
		).then((res) => res.text()).then((html) => {
			const $ = cheerio.load(html);

			const apacheInput = $("input");
			apacheToken = apacheInput.attr("value");

			const schedule: Period[] = [];

			const tableRows = $("#contentArea > table:nth-child(2) > tbody > tr:nth-child(1) > td.contentContainer > table:nth-child(2) > tbody > tr:nth-child(6) > td > div > table > tbody > tr > td > table > tbody > tr");

			tableRows.each((index, row) => {
				const classInfo = $(row).find("td:nth-child(2) > table > tbody > tr > td").html()?.split("<br>").map((str) => str.trim());

				const timeInfo = $(row).find("td:nth-child(1) > table > tbody > tr:nth-child(2) > td").text().split(" - ");

				const boxColor = $(row).find("td:nth-child(2)").attr("style")?.split(":")[1]?.slice(0, -1);

				if (classInfo) {
					const period: Period = {
						startTime: timeInfo[0],
						endTime: timeInfo[1],
						name: classInfo[1],
						teacher: classInfo[2],
						room: classInfo[3],
						color: boxColor ? boxColor : "",
						id: classInfo[0],
					};

					schedule.push(period);
				}
			});

			return schedule;
		});

		cookies().set("apacheToken", apacheToken ? apacheToken : "");
		cookies().set("scheduleData", JSON.stringify(schedule));

		// getScheduleWithLunch(schedule);

		const endTime = new Date();
		const elapsedTime = endTime.getTime() - startTime.getTime();
		console.log("\x1b[32m ✓\x1b[0m scraped schedele in", elapsedTime, "ms");

		return NextResponse.json({ text: "Scraped Schedule" }, { status: 200 });
	} catch (error) {
		console.error("Error during scraping:", error);
		if (res.status) {
			return NextResponse.json(
				{ error: "Internal Server Error" },
				{ status: 500 },
			);
		} else {
			console.error("res object does not have a status function");
		}

		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
