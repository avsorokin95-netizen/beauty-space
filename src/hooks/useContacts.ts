import { createContext, useContext } from 'react';
import { contactView } from '../../shared/contacts';

export const ContactsContext = createContext<ReturnType<typeof contactView> | null>(null);
export function useContacts() {
  const value = useContext(ContactsContext);
  if (!value) throw new Error('ContactsProvider is required');
  return value;
}
