import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BrandLogo } from '../../components/common/BrandLogo.jsx'
import { MyDashboardMenu } from '../../components/common/MyDashboardMenu.jsx'
import { ErrorState } from '../../components/common/ErrorState.jsx'
import { SubscribeFeatureAlert } from '../../components/common/SubscribeFeatureAlert.jsx'
import { SellerIdentity } from '../../components/common/SellerIdentity.jsx'
import { RequestQuoteModal } from '../../components/quotation/RequestQuoteModal.jsx'
import { PageLoader } from '../../components/ui/PageLoader.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useAppSelector } from '../../hooks/redux.js'
import { selectHasBuyerSubscription } from '../../store/slices/subscriptionSlice.js'
import { fetchCatalogProduct } from '../../services/catalog.service.js'
import { addWishlistItem, getWishlistIds } from '../../utils/wishlistStorage.js'
import { canAccessBuyerWorkspace } from '../../utils/portalNav.js'
import { formatProductPrice } from '../../utils/formatPrice.js'
import { resolveUploadUrl } from '../../utils/uploadUrl.js'

function productDetailImage(product) {
  if (!product?.imageUrl) return `https://picsum.photos/seed/catalog-${product.id}/1200/900`
  return product.source === 'seller' ? resolveUploadUrl(product.imageUrl) : product.imageUrl
}

function formatMoney(n, currency = 'INR') {
  return formatProductPrice(n, currency)
}

export function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, initialized: authInitialized } = useAuth()
  const hasBuyerSubscription = useAppSelector(selectHasBuyerSubscription)
  const buyerWorkspace = canAccessBuyerWorkspace(user?.role, hasBuyerSubscription)
  const showRfqButton = !isAuthenticated || buyerWorkspace

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistSubscribeAlertOpen, setWishlistSubscribeAlertOpen] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [quoteSubscribeAlertOpen, setQuoteSubscribeAlertOpen] = useState(false)

  const loadProduct = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCatalogProduct(productId)
      if (!data) {
        setProduct(null)
        setError({ message: 'Product not found' })
        return
      }
      setProduct(data)
    } catch (err) {
      setError({ message: err.message || 'Failed to load product' })
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  useEffect(() => {
    if (product?.id) {
      setWishlisted(getWishlistIds().has(String(product.id)))
    }
  }, [product?.id])

  const handleWishlist = useCallback(() => {
    if (!isAuthenticated) {
      toast('Sign in as a buyer to use the wishlist.', { icon: 'ℹ️' })
      navigate('/login')
      return
    }
    if (!buyerWorkspace) {
      toast.error('Buyer workspace access is required for the wishlist.')
      return
    }
    if (!hasBuyerSubscription) {
      setWishlistSubscribeAlertOpen(true)
      toast('Subscribe to use the wishlist feature.', { icon: 'ℹ️', duration: 5000 })
      return
    }
    addWishlistItem(product)
    setWishlisted(true)
    toast.success(`"${product.title}" wishlisted.`)
  }, [hasBuyerSubscription, isAuthenticated, navigate, product, user?.role])

  const handleRequestQuote = useCallback(() => {
    if (!isAuthenticated) {
      toast('Sign in to request a quotation.', { icon: 'ℹ️' })
      navigate('/login')
      return
    }
    if (!buyerWorkspace) {
      toast.error('Buyer workspace access is required to request quotations.')
      return
    }
    if (!hasBuyerSubscription) {
      setQuoteSubscribeAlertOpen(true)
      return
    }
    if (product?.source !== 'seller') {
      toast.error('Quotations are available for seller-listed products only.')
      return
    }
    setQuoteModalOpen(true)
  }, [buyerWorkspace, hasBuyerSubscription, isAuthenticated, navigate, product?.source])

  const handleQuoteSuccess = useCallback(
    (data) => {
      const requestId = data?.request?.id || data?.group?.requests?.[0]?.id
      if (requestId) navigate(`/buyer/quotations/${requestId}`)
    },
    [navigate],
  )

  return (
    <div className="mpPage mpPage--detail">
      <header className="mpHeader">
        <div className="mpHeader__inner">
          <Link to="/" className="mpBrand" aria-label="Bold and Wise home">
            <BrandLogo size="nav" alt="" className="mpBrand__logo" />
            <span className="mpBrand__title">Bold and Wise</span>
          </Link>

          <nav className="mpNav" aria-label="Primary">
            <Link to="/" className="mpNav__link">Home</Link>
            <Link to="/products" className="mpNav__link mpNav__link--current">Product</Link>
            <Link to="/pricing" className="mpNav__link">Pricing</Link>
            <Link to="/contact" className="mpNav__link">Help &amp; Contact</Link>
            {authInitialized && isAuthenticated ? (
              <MyDashboardMenu
                linkClassName="mpNav__link mpNav__link--dashboard"
                menuClassName="dashboardMenu dashboardMenu--mpNav"
              />
            ) : null}
          </nav>
        </div>
      </header>

      <main className="pdMain">
        <div className="pdShell">
          <nav className="pdBreadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden>/</span>
            <Link to="/products">Products</Link>
            {product?.category?.name ? (
              <>
                <span aria-hidden>/</span>
                <span>{product.category.name}</span>
              </>
            ) : null}
          </nav>

          {loading ? (
            <PageLoader label="Loading product" />
          ) : error ? (
            <ErrorState
              title="Product unavailable"
              message={error.message}
              onRetry={loadProduct}
              retrying={loading}
            />
          ) : product ? (
            <>
              <article className="pdHero">
                <div className="pdGallery">
                  <img
                    className="pdGallery__img"
                    src={productDetailImage(product)}
                    alt={product.title}
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = `https://picsum.photos/seed/catalog-${product.id}/1200/900`
                    }}
                  />
                </div>

                <div className="pdBuyBox">
                  <p className="pdInfo__eyebrow">{product.category?.name || 'Catalog product'}</p>
                  <h1 className="pdInfo__title">{product.title}</h1>
                  <div className="pdInfo__rating">
                    <span className="pdInfo__stars" aria-hidden>★★★★★</span>
                    <span>4.8 buyer rating</span>
                  </div>

                  <div className="pdInfo__priceBlock">
                    <div className="pdInfo__price">
                      {formatMoney(product.price, product.currency || 'INR')}
                      <span className="pdInfo__priceUnit"> / piece</span>
                    </div>
                    <p className="pdInfo__priceNote">Wholesale unit price for B2B buyers</p>
                  </div>

                  <div className="pdInfo__supplier">
                    {product.source === 'seller' && product.seller ? (
                      <SellerIdentity seller={product.seller} />
                    ) : (
                      <>
                        <strong>Supplier:</strong> {product.brand?.name || '—'}
                      </>
                    )}
                  </div>

                  <div className="pdInfo__actions">
                    {showRfqButton && product.source === 'seller' ? (
                      <button
                        type="button"
                        className="btn btn--primary pdInfo__primaryBtn"
                        onClick={handleRequestQuote}
                      >
                        Request quotation
                      </button>
                    ) : null}
                    <button type="button" className="btnOutline pdInfo__secondaryBtn" onClick={handleWishlist}>
                      {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                    </button>
                  </div>
                </div>
              </article>

              <div className="pdLower">
                <section className="pdPanel">
                  <h2>About this product</h2>
                  <p>{product.description || 'No description provided for this catalog item.'}</p>
                </section>

                <section className="pdPanel">
                  <h2>Product details</h2>
                  <dl className="pdFacts">
                    <div><dt>Category</dt><dd>{product.category?.name || '—'}</dd></div>
                    <div><dt>Brand</dt><dd>{product.brand?.name || '—'}</dd></div>
                    {product.source === 'seller' && product.seller ? (
                      <div className="pdFacts__seller">
                        <dt>Seller</dt>
                        <dd><SellerIdentity seller={product.seller} compact showLabel /></dd>
                      </div>
                    ) : null}
                    <div><dt>Listing ID</dt><dd>{product.id}</dd></div>
                  </dl>
                </section>
              </div>
            </>
          ) : null}
        </div>
      </main>

      <RequestQuoteModal
        open={quoteModalOpen}
        product={product}
        onClose={() => setQuoteModalOpen(false)}
        onSuccess={handleQuoteSuccess}
      />
      <SubscribeFeatureAlert
        open={quoteSubscribeAlertOpen}
        title="Subscribe to request quotations"
        message="Send RFQs to sellers with an active buyer plan."
        onClose={() => setQuoteSubscribeAlertOpen(false)}
        onSubscribe={() => {
          setQuoteSubscribeAlertOpen(false)
          navigate('/pricing')
        }}
      />
      <SubscribeFeatureAlert
        open={wishlistSubscribeAlertOpen}
        title="Subscribe to use wishlist"
        message="Save products to your wishlist with an active buyer plan. Choose a plan on Plans & Pricing to unlock this feature."
        onClose={() => setWishlistSubscribeAlertOpen(false)}
        onSubscribe={() => {
          setWishlistSubscribeAlertOpen(false)
          navigate('/pricing')
        }}
      />
    </div>
  )
}
