/*
============================================================
CUSTOMER TAGGING SYSTEM - QUICK REFERENCE
Use this for rapid development and integration
============================================================
(This file is safely commented out so it doesn't break React)

1. DISPLAY A CUSTOMER TAG (READ-ONLY)
<CustomerTagBadge tag={getFinalTag(customer)} />

2. DISPLAY CLICKABLE TAG (OPENS EDIT DIALOG)
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [selectedCustomer, setSelectedCustomer] = useState(null);

<CustomerTagBadge
  tag={getFinalTag(customer)}
  onClick={() => {
    setSelectedCustomer(customer);
    setEditDialogOpen(true);
  }}
/>

<CustomerTagEditDialog
  isOpen={editDialogOpen}
  onClose={() => setEditDialogOpen(false)}
  customer={selectedCustomer}
  onTagUpdated={(newTag) => {
    console.log('Tag updated to:', newTag);
  }}
/>
*/

export default function QuickReference() {
  return null;
}