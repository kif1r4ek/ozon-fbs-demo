import ExcelJS from "exceljs";

export async function generatePostingsXlsx(postings, sheetTitle) {
	const workbook = new ExcelJS.Workbook();
	workbook.created = new Date();

	const worksheet = workbook.addWorksheet(sheetTitle);

	worksheet.columns = [
		{ header: "Наименование", key: "name", width: 50 },
		{ header: "Артикул", key: "offerId", width: 16 },
		{ header: "Количество", key: "quantity", width: 14 },
	];

	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.alignment = { vertical: "middle" };

	for (const posting of postings) {
		for (const product of posting.products) {
			worksheet.addRow({
				name: product.name,
				offerId: product.offerId,
				quantity: product.quantity,
			});
		}
	}

	return workbook.xlsx.writeBuffer();
}

