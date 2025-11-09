/**
 * Styled components for side navigation menu items.
 * 
 * This module contains all styled components used in the side navigation
 * system, including:
 * - Main navigation root container
 * - Menu item wrappers and links
 * - Expansion and collapse animations
 * - Hover and active state styling
 * 
 * The styles implement a collapsible sidebar with smooth transitions
 * and consistent theming throughout the navigation interface.
 */

import { styled } from '@mui/material';
import { Link } from 'react-router-dom';

export const SideNavRoot = styled("div")({
  flexGrow: 1,
  backgroundColor: "#f6f6f6",
  height: "calc(100vh - 64px)",
  display: "flex",
  flexDirection: "row",

  // for sidebar
  "& .expanded": {
    transitionDuration: "500ms",
    width: "200px",
    "& div.expander": {
      flexDirection: "row",
    },
  },
  "& .collapsed": {
    transitionDuration: "500ms !important",
    width: "48px",
    "& div.expander": {
      flexDirection: "row",
    },
  },

  "& .MuiDrawer-paperAnchorDockedLeft": {
    top: "64px!important",
    background: "#36454f",
    flex: "0 0 auto",
    "& .MuiListItemButton-root": {
      backgroundcolor: "#36454f!important",
      color: "#fff!important",
    },
  },
  "& .MuiList-root": {
    backgroundColor: "#36454f!important",
  },
  "& nav.MuiList-root": {
    marginBottom: "75px",
  },
  "& .MuiTypography-root": {
    fontSize: ".95em",
  },
  "& ul li a.MuiListItem-root.active": {
    backgroundColor: "rgb(0 0 0 / 30%)!important",
  },
});

export const BodyWrapper = styled("div")({
  display: "flex",
  flexGrow: 1,
  width: "calc(100% - 48px)",
  height: "calc(100vh - 64px)",
});

export const Wink = styled(Link)({
  display: 'flex',
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
  position: 'relative',
  flexGrow: 1,
//   margin: '0 8px',
  padding: '2px 10px',
  height: 'auto',
  minHeight: '36px',
  color: '#fff',
  textDecoration: 'none',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  '&:active': {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  '&.selected': {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  }
});

export const MenuItemWrapper = styled('div')({
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  alignItems: 'flex-start',
  width: '100%',
  '& .close': {
    display: 'none',
    height: 0,
    transition: 'all .4s ease',
  },
  '& .mini': {
    display: 'none',
  },
  '& .hide': {
    left: '-10000px!important',
  },
  '& .item-link:hover': {
    cursor: 'pointer'
  },
  '& .home-link:hover, .single-link:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.3)!important',
    cursor: 'pointer',
    color: '#fff',
  },
  '& .single-link.active': {
    backgroundColor: 'rgba(0, 0, 0, 0.3)!important',
  },
});

export const PopupMenuItemWrapper = styled('div')({
  flexShrink: 0,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
});

export const MenuItemLine = styled('div')({
  alignItems: 'center',
  display: 'flex',
  width: '100%',
  flexDirection: 'row',
});

export const IconWrapper = styled('div')({
  minWidth: '24px',
  width: '24px',
  height: '24px',
  color: '#fff',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
});

export const ItemLink = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  position: 'relative',
  flexGrow: 1,
  margin: 0,
  padding: '0 12px',
  color: '#fff',
});

export const ItemLabel = styled('span')({
  color: '#fff',
  fontSize: '0.95rem',
  flexGrow: 1,
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'row',
  paddingLeft: '12px',
  fontWeight: 400,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const SideMenuWrapper = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#36454f',
  position: 'relative',
  transition: 'all .4s ease',
  '&.expanded': {
    width: '200px',
  },
  '&.collapsed': {
    width: '48px',
  }
});

export const SideNavigationWrapper = styled('div')({
  transition: 'all .4s ease',
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  height: '100%',
});

export const NavigationList = styled('div')({
  flexGrow: 1,
  flexDirection: 'column',
  display: 'flex',
  paddingTop: '10px',
});

export const Expander = styled('div')({
  padding: '10px',
  position: 'relative',
  color: '#fff',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  width: '100%',
  marginTop: 'auto',
  zIndex: 10,
  pointerEvents: 'auto',
  '&.expander': {
    flexDirection: 'row',
  }
});

export const ExpanderArrow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  }
});
