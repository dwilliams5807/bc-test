import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
        this.addAllToCart = this.addAllToCart.bind(this);
        this.deleteCart = this.deleteCart.bind(this);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();

        this.getCart();

        document.getElementById("addButton").addEventListener("click", this.addAllToCart); 
        document.getElementById("removeButton").addEventListener("click", this.deleteCart); 
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }

    async getCart() {
        const addButton = document.getElementById("addButton");
        const removeButton = document.getElementById("removeButton");
        try {
          const response = await fetch('/api/storefront/carts?', {
            method: 'GET',
            credentials: "same-origin",
          });
          const data = await response.json();
          if (data[0].id) {
            addButton.disabled = true;
            removeButton.classList.remove("hide")
            return data[0].id;
          } else {
          removeButton.classList.add("hide")
          addButton.disabled = false;
          }
        } catch {
          removeButton.classList.add("hide")
          addButton.disabled = false;
        }
      }

     addAllToCart() {
        const tipTool = document.getElementById("tipTool")
        const lineItems = this.context.catProducts.map(product => {
          return {
            quantity: 1,
            product_id: product.id
          };
        });
        const requestBody = {
          line_items: lineItems
        };
          fetch('/api/storefront/carts', {
            method: 'POST',
            credentials: "same-origin",
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          })
          .then(response => response.json())
          .then(data => {
              tipTool.innerText = `${lineItems.length} item(s) added to cart`
              this.getCart();
              setTimeout(() => {
               tipTool.innerText = ""
               }, 3000);
      
          })
          .catch(error => {
            console.error('Error adding items to cart', error);
          });
      }

    async deleteCart() {
        const cartID = await this.getCart();
        const tipTool = document.getElementById("tipTool")
        if (cartID) {
          fetch(`/api/storefront/carts/${cartID}?`, {
            method: 'DELETE',
            credentials: "same-origin",
          })
            .then(response => response.text())
            .then(data => {
              tipTool.innerText = "All items have been deleted from the cart"
              this.getCart();
              setTimeout(() => {
              tipTool.innerText = ""
               }, 3000);
            })
            .catch(error => {
              console.error("error deleting cart", error);
            });
        } else {
          console.log("no cart found");
        }
      }
}
