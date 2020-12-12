const actionButton = document.querySelector('#convert');

const psProductFields = [
  'id', 'active', 'name', 'categories', 
  'price tax excluded', 'tax rules id', 'wholesale price', 'on sale', 
  'discount amount', 'discount percent', 'discount from', 'discount to', 
  'reference', 'supplier reference', 'supplier', 'manufacturer', 'ean13', 
  'upc', 'ecotax', 'width', 'height', 'depth', 'weight', 
  'delivery time in-stock', 'delivery time out-of-stock',
  'quantity', 'minimal quantity', 'low stock level', 'send email when quantity < level',
  'visibility', 'additional shipping cost', 'unity', 'unit price',
  'summary', 'description', 'tags', 'meta title', 'meta keywords', 
  'meta description', 'URL rewritten', 'text when in stock', 'text when backorder allowed',
  'available for order', 'available date', 'creation date', 'show price',
  'image URLs', 'image alt texts', 'delete existing images', 'feature',
  'online only', 'condition', 'customizable (0 = No, 1 = Yes)', 
  'uploadable files (0 = No, 1 = Yes)', 'text fields (0 = No, 1 = Yes)',
  'out of stock action', 'virtual product', 'file URL', 'allowed downloads',
  'expiration date', 'number of days', 'shop id/name', 
  'advanced stock management', 'depends On Stock', 'warehouse', 'acessories'
];

actionButton.addEventListener('click', async (event) => {
  event.stopPropagation();
  event.preventDefault();
  const option = document.querySelector('#options').value;
  const xml = document.querySelector('#xml').files[0];
  let csv;

  switch (option) {
    case "products":
      csv = await getProductsCsv(xml);
      break;
    case "combinations":
      csv = await getCombinationsCsv(xml);
      break;
  }

  for (const lang in csv) {
    const langName = lang === '1' ? 'es' : lang === '2' ? 'ca' : 'en';
    const encodedUri = encodeURI(csv[lang]);

    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${option}-${langName}.csv`);
    document.body.appendChild(link);
    link.click();
  }
});

function getFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = reject;

    reader.readAsText(file);
  })
}

async function parseXml(xml) {
  try {
    const content = await getFileContent(xml);
    const parser = new DOMParser();
    const parsedXml = parser.parseFromString(content, 'application/xml');
    if (parsedXml.documentElement.nodeName === 'parsererror') {
      throw new Error('Error while parsing XML file.');
    } else {
      return parsedXml.documentElement;
    }
  } catch(error) {
    alert(error);
  }
}

async function getProductsCsv(xml) {
  const xmlProducts = await parseXml(xml);
  const products = Array.from(xmlProducts.querySelectorAll('twinPrestaShop5'));
  const filteredByLang = filterByLang(products);
  const csv = {};
  for (const lang in filteredByLang) {
    csv[lang] = parseProductsXml2Csv(filteredByLang[lang]);
  }

  return csv;
}

function filterByLang(xmlItems) {
  return xmlItems.reduce((filtered, value) => {
    const lang = value.querySelector('language').innerHTML;
    if (!filtered[lang]) filtered[lang] = [];
    filtered[lang].push(value);
    return filtered;
  }, {});
}

function parseProductsXml2Csv(xmlProducts) {
  let csv = 'data:text/csv;charset=utf-8,';
  csv += psProductFields.join(';') + '\n';
  xmlProducts.forEach(product => { csv += buildProductLine(product) + '\n'; });
  return csv;
}

function buildProductLine(xmlProduct) {
  let line = '';
  for (const field of psProductFields) {
    let fieldValue = getProductValue(xmlProduct, field);
    fieldValue = fieldValue.replace(/"/g, "'");
    line += `"${fieldValue}"`;
    line += ';'
  }
  return line;
}

function getProductValue(xmlProduct, field) {
  switch (field) {
    case 'active':
      const active = xmlProduct.querySelector('active').innerHTML;
      if (active !== '0' && active !== '1') throw new Error('Wrong active value');
      return active;
    case 'name':
      const name = xmlProduct.querySelector('name').innerHTML;
      if (!name || name === '') throw new Error('No product name');
      return name;
    case 'categories':
      return xmlProduct.querySelector('category').innerHTML;
    case 'price tax excluded':
      return xmlProduct.querySelector('price_tin').innerHTML;
    case 'tax rules id':
      return xmlProduct.querySelector('id_tax_rules_group').innerHTML;
    case 'wholesale price':
      return xmlProduct.querySelector('wholesale_price').innerHTML;
    case 'on sale':
      const onSale = xmlProduct.querySelector('on_sale').innerHTML;
      if (onSale !== '0' && onSale !== '1') throw new Error('Wrong on_sale value');
      return onSale;
    case 'discount amount':
      return xmlProduct.querySelector('reduction_price').innerHTML;
    case 'discount percent':
      return xmlProduct.querySelector('reduction_percent').innerHTML;
    case 'reference':
      return xmlProduct.querySelector('reference').innerHTML;
    case 'supplier reference':
      return xmlProduct.querySelector('supplier_reference').innerHTML;
    case 'supplier':
      return xmlProduct.querySelector('supplier').innerHTML;
    case 'manufacturer':
      return xmlProduct.querySelector('manufacturer').innerHTML;
    case 'ean13':
      return xmlProduct.querySelector('ean13').innerHTML;
    case 'weight':
      return xmlProduct.querySelector('weight').innerHTML;
    case 'quantity':
      return xmlProduct.querySelector('quantity').innerHTML;
    case 'summary':
      return xmlProduct.querySelector('description_short').innerHTML;
    case 'description':
      return xmlProduct.querySelector('description').innerHTML;
    case 'meta title':
      return xmlProduct.querySelector('meta_title').innerHTML;
    case 'meta keywords':
      return xmlProduct.querySelector('meta_keywords').innerHTML;
    case 'meta description':
      return xmlProduct.querySelector('meta_description').innerHTML;
    case 'URL rewritten':
      return xmlProduct.querySelector('link_rewrite').innerHTML;
    case 'available for order':
      const available = xmlProduct.querySelector('available_for_order').innerHTML;
      if (available !== '0' && available !== '1') throw new Error('Wrong available_for_order value');
      return available;
    case 'show price': 
      const showPrice = xmlProduct.querySelector('show_price').innerHTML;
      if (showPrice !== '0' && showPrice !== '1') throw new Error('Wrong show_price value');
      return showPrice;
    case 'delete existing images':
      const deleteImages = xmlProduct.querySelector('delete_existing_images').innerHTML;
      if (deleteImages !== '0' && deleteImages !== '1') throw new Error('Wrong delete_existing_images value');
      return deleteImages;
    case 'feature':
      return xmlProduct.querySelector('features').innerHTML;
    case 'online only':
      const onlineOnly = xmlProduct.querySelector('online_only').innerHTML;
      if (onlineOnly !== '0' && onlineOnly !== '1') throw new Error('Wrong online_only value');
      return onlineOnly;
    case 'customizable':
    case 'uploadable files':
    case 'text fields':
      return '0';
    case 'shop id/name':
      return xmlProduct.querySelector('shop').innerHTML;
    default:
      return '';
  }
}
