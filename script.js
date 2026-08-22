// ==========================================================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmMvpuCwr0xIPMtqxYeFtoqkulPzGy6Ok",
  authDomain: "projeto-cardapio-thurler12.firebaseapp.com",
  projectId: "projeto-cardapio-thurler12",
  storageBucket: "projeto-cardapio-thurler12.firebasestorage.app",
  messagingSenderId: "536350657388",
  appId: "1:536350657388:web:8042646fe3e018aca48149",
  measurementId: "G-RYC0VQ2ZL2"
};

// Inicializa o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productsRef = collection(db, "produtos");

let globalProducts = [];

// ==========================================================================
// 1. SINCRONIZAÇÃO EM TEMPO REAL (LISTENERS)
// ==========================================================================
onSnapshot(productsRef, (snapshot) => {
  globalProducts = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  // Atualiza as telas se estiverem visíveis
  renderPublicProducts(globalProducts);
  renderAdminProducts(globalProducts);
});

// ==========================================================================
// 2. EXIBIÇÃO NO CARDÁPIO PÚBLICO (INDEX.HTML)
// ==========================================================================
const productContainer = document.getElementById('product-list');
const categoryButtons = document.querySelectorAll('.filter-btn');

function renderPublicProducts(products) {
  if (!productContainer) return;

  productContainer.innerHTML = '';

  if (products.length === 0) {
    productContainer.innerHTML = '<p class="empty-msg">Nenhum sabor cadastrado no momento.</p>';
    return;
  }

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" class="product-image">
      <div class="product-info">
        <span class="product-badge">${product.category}</span>
        <h3 class="product-title">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
      </div>
    `;

    productContainer.appendChild(card);
  });
}

// Filtros por categoria
categoryButtons.forEach(button => {
  button.addEventListener('click', () => {
    categoryButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const category = button.dataset.category;
    if (category === 'Todos') {
      renderPublicProducts(globalProducts);
    } else {
      const filtered = globalProducts.filter(p => p.category === category);
      renderPublicProducts(filtered);
    }
  });
});

// ==========================================================================
// 3. PAINEL ADMIN (ADMIN.HTML) - CADASTRAR, EDITAR E EXCLUIR
// ==========================================================================
const productForm = document.getElementById('product-form');
const adminProductList = document.getElementById('admin-product-list');
const editIdInput = document.getElementById('edit-id');
const formTitle = document.getElementById('form-title');
const btnSubmit = document.getElementById('btn-submit');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const imgInput = document.getElementById('prod-img');

function renderAdminProducts(products) {
  if (!adminProductList) return;

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
        <button class="filter-btn btn-edit-action" data-id="${product.id}">✏️ Editar</button>
        <button class="btn-delete btn-delete-action" data-id="${product.id}">Excluir</button>
      </div>
    `;

    adminProductList.appendChild(itemCard);
  });

  // Eventos nos botões de editar/excluir
  document.querySelectorAll('.btn-edit-action').forEach(btn => {
    btn.addEventListener('click', () => prepareEditProduct(btn.dataset.id));
  });

  document.querySelectorAll('.btn-delete-action').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

// Prepara formulário para edição
function prepareEditProduct(id) {
  const product = globalProducts.find(p => p.id === id);
  if (!product) return;

  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-category').value = product.category;
  document.getElementById('prod-desc').value = product.description;
  editIdInput.value = product.id;

  imgInput.removeAttribute('required');

  if (formTitle) formTitle.textContent = 'Editar Sabor';
  if (btnSubmit) btnSubmit.textContent = 'Salvar Alterações';
  if (btnCancelEdit) btnCancelEdit.classList.remove('hidden');

  productForm.scrollIntoView({ behavior: 'smooth' });
}

// Cancelar Edição
if (btnCancelEdit) {
  btnCancelEdit.addEventListener('click', resetAdminForm);
}

function resetAdminForm() {
  if (!productForm) return;
  productForm.reset();
  editIdInput.value = '';
  imgInput.setAttribute('required', 'true');
  if (formTitle) formTitle.textContent = 'Cadastrar Novo Sabor';
  if (btnSubmit) btnSubmit.textContent = '+ Adicionar Sabor';
  if (btnCancelEdit) btnCancelEdit.classList.add('hidden');
}

// Excluir Produto no Firestore
async function deleteProduct(id) {
  if (confirm("Tem certeza que deseja excluir este sabor?")) {
    try {
      await deleteDoc(doc(db, "produtos", id));
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir sabor do banco de dados.");
    }
  }
}

// Enviar Formulário (Criar ou Atualizar no Firebase)
if (productForm) {
  productForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('prod-name').value;
    const category = document.getElementById('prod-category').value;
    const description = document.getElementById('prod-desc').value;
    const docIdToEdit = editIdInput.value;
    const file = imgInput.files[0];

    const saveToFirestore = async (imageBase64) => {
      try {
        if (docIdToEdit) {
          // Atualiza existente
          const docRef = doc(db, "produtos", docIdToEdit);
          const updateData = { name, category, description };
          if (imageBase64) updateData.image = imageBase64;

          await updateDoc(docRef, updateData);
        } else {
          // Cria novo
          await addDoc(productsRef, {
            name,
            category,
            description,
            image: imageBase64 || '',
            createdAt: new Date()
          });
        }
        resetAdminForm();
      } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar sabor no banco de dados.");
      }
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => saveToFirestore(e.target.result);
      reader.readAsDataURL(file);
    } else {
      saveToFirestore(null);
    }
  });
}