// ==========================================================================
// 1. GERENCIAMENTO DE SABORES (LOCALSTORAGE)
// ==========================================================================
function getProducts() {
  const savedProducts = localStorage.getItem('icecream_flavors');
  if (savedProducts) {
    return JSON.parse(savedProducts);
  } else {
    const initialProducts = [
      {
        id: 1,
        name: 'Pistache Cream',
        category: 'Tradicionais',
        description: 'Gelato artesanal preparado com pasta pura de pistache italiano.',
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=60'
      },
      {
        id: 2,
        name: 'Morango Zero Lactose',
        category: 'Sem Lactose',
        description: 'Sorbet 100% fruta feito com morangos frescos, zero leite.',
        image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=500&auto=format&fit=crop&q=60'
      }
    ];
    localStorage.setItem('icecream_flavors', JSON.stringify(initialProducts));
    return initialProducts;
  }
}

function saveProducts(products) {
  localStorage.setItem('icecream_flavors', JSON.stringify(products));
}

// ==========================================================================
// 2. RENDERIZAÇÃO E FILTRO NA VITRINE (INDEX.HTML)
// ==========================================================================
const productsGrid = document.querySelector('.products-grid');
const filterBtns = document.querySelectorAll('.filter-btn');

function renderPublicProducts(categoryFilter = 'todos') {
  if (!productsGrid) return;

  const products = getProducts();
  productsGrid.innerHTML = '';

  const filteredProducts = categoryFilter === 'todos' 
    ? products 
    : products.filter(p => p.category === categoryFilter);

  if (filteredProducts.length === 0) {
    productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum sabor encontrado nesta categoria.</p>';
    return;
  }

  filteredProducts.forEach(product => {
    const productCard = document.createElement('article');
    productCard.className = 'product-card';

    productCard.innerHTML = `
      <img src="${product.image}" alt="${product.name}" class="product-image">
      <div class="product-info">
        <span class="badge-category">${product.category}</span>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${product.description}</p>
      </div>
    `;

    productsGrid.appendChild(productCard);
  });
}

// Configura os cliques nos botões de filtro
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const selectedCategory = btn.getAttribute('data-category');
    renderPublicProducts(selectedCategory);
  });
});

// ==========================================================================
// 3. RENDERIZAÇÃO, CADASTRO E EDIÇÃO NO PAINEL (ADMIN.HTML)
// ==========================================================================
const productForm = document.getElementById('product-form');
const adminProductList = document.getElementById('admin-product-list');
const editIdInput = document.getElementById('edit-id');
const formTitle = document.getElementById('form-title');
const btnSubmit = document.getElementById('btn-submit');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const imgInput = document.getElementById('prod-img');

function renderAdminProducts() {
  if (!adminProductList) return;

  const products = getProducts();
  adminProductList.innerHTML = '';

  if (products.length === 0) {
    adminProductList.innerHTML = '<p style="color: var(--text-muted);">Nenhum sabor cadastrado no momento.</p>';
    return;
  }

  products.forEach(product => {
    const itemCard = document.createElement('div');
    itemCard.className = 'admin-item-card';

    itemCard.innerHTML = `
      <div class="admin-item-info">
        <img src="${product.image}" alt="${product.name}" class="admin-item-img">
        <div>
          <strong>${product.name}</strong> <small>(${product.category})</small>
          <p style="font-size: var(--font-sm); color: var(--text-muted);">${product.description}</p>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="filter-btn" onclick="editProduct(${product.id})">✏️ Editar</button>
        <button class="btn-delete" onclick="deleteProduct(${product.id})">Excluir</button>
      </div>
    `;

    adminProductList.appendChild(itemCard);
  });
}

// Função para carregar os dados no formulário e preparar a edição
function editProduct(id) {
  const products = getProducts();
  const product = products.find(p => p.id === id);

  if (!product) return;

  // Preenche os campos com os dados atuais
  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-category').value = product.category;
  document.getElementById('prod-desc').value = product.description;
  editIdInput.value = product.id;

  // A foto não é obrigatória na edição (para não perder a foto antiga caso o usuário não altere)
  imgInput.removeAttribute('required');

  // Altera os títulos e exibe o botão de cancelar
  formTitle.textContent = 'Editar Sabor';
  btnSubmit.textContent = 'Salvar Alterações';
  btnCancelEdit.classList.remove('hidden');

  // Rola suavemente até o formulário
  productForm.scrollIntoView({ behavior: 'smooth' });
}

// Função para cancelar edição
if (btnCancelEdit) {
  btnCancelEdit.addEventListener('click', resetAdminForm);
}

function resetAdminForm() {
  if (!productForm) return;
  productForm.reset();
  editIdInput.value = '';
  imgInput.setAttribute('required', 'true');
  formTitle.textContent = 'Cadastrar Novo Sabor';
  btnSubmit.textContent = '+ Adicionar Sabor';
  btnCancelEdit.classList.add('hidden');
}

// Submissão do formulário (Criar ou Editar)
if (productForm) {
  productForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('prod-name').value;
    const category = document.getElementById('prod-category').value;
    const description = document.getElementById('prod-desc').value;
    const isEditing = editIdInput.value !== '';
    const file = imgInput.files[0];

    let products = getProducts();

    // Função interna para finalizar e salvar
    const finalizeSave = (imageBase64) => {
      if (isEditing) {
        const idToEdit = Number(editIdInput.value);
        products = products.map(p => {
          if (p.id === idToEdit) {
            return {
              ...p,
              name,
              category,
              description,
              image: imageBase64 || p.image // Mantém a foto antiga se nenhuma nova for enviada
            };
          }
          return p;
        });
      } else {
        const newProduct = {
          id: Date.now(),
          name,
          category,
          description,
          image: imageBase64
        };
        products.push(newProduct);
      }

      saveProducts(products);
      resetAdminForm();
      renderAdminProducts();
    };

    // Processamento de imagem se houver novo arquivo
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => finalizeSave(e.target.result);
      reader.readAsDataURL(file);
    } else {
      finalizeSave(null);
    }
  });
}

// ==========================================================================
// 4. AUTENTICAÇÃO E INITIALIZAÇÃO
// ==========================================================================
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (email === 'alex.retamales.ar@gmail.com' && password === '123456') {
      window.location.href = 'admin.html';
    } else {
      document.getElementById('login-error')?.classList.remove('hidden');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderPublicProducts();
  renderAdminProducts();
});