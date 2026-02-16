const MS_TOKEN = "38946db586067d35f5458aef5975969c16c01526";
const MS_BASE_URL = "https://api.moysklad.ru/api/remap/1.2";

const readline = require("readline");

async function getProductByArticle(article) {
	const url = `${MS_BASE_URL}/entity/product?filter=article=${encodeURIComponent(article)}`;

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${MS_TOKEN}`,
			"Accept-Encoding": "gzip",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP error: ${response.status}`);
	}

	const data = await response.json();
	const rows = data.rows || [];

	if (rows.length === 0) {
		return null;
	}

	return rows[0];
}

function printBarcodes(product) {
	const barcodes = product.barcodes || [];

	if (barcodes.length === 0) {
		console.log("⚠️ У товара нет штрихкодов");
		return;
	}

	console.log(`\nТовар: ${product.name}`);
	console.log(`Артикул: ${product.article}`);
	console.log("\nШтрихкоды:\n");

	for (const barcode of barcodes) {
		for (const [type, value] of Object.entries(barcode)) {
			console.log(`${type.toUpperCase()}: ${value}`);
		}
	}
}

async function main() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.question("Введите артикул: ", async (article) => {
		try {
			const product = await getProductByArticle(article.trim());

			if (!product) {
				console.log("❌ Товар не найден");
			} else {
				printBarcodes(product);
			}
		} catch (err) {
			console.error("Ошибка:", err.message);
		} finally {
			rl.close();
		}
	});
}

main();
