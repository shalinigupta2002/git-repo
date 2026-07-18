export function ManageProfileButton({ manageProfileUrl, mainPortalIntegrated }) {
  const enabled = Boolean(mainPortalIntegrated && manageProfileUrl)

  if (enabled) {
    return (
      <a
        href={manageProfileUrl}
        className="btn btn--primary profileManageBtn"
        target="_blank"
        rel="noopener noreferrer"
      >
        Manage profile in Main Portal
      </a>
    )
  }

  return (
    <button type="button" className="btn btn--primary profileManageBtn" disabled title="Coming soon">
      Manage profile in Main Portal
    </button>
  )
}
