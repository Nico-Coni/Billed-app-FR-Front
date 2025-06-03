/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import Bills from "../containers/Bills.js"
import { ROUTES_PATH, ROUTES } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store.js"
import { formatDate, formatStatus } from "../app/format.js"
import '@testing-library/jest-dom'

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      // Je remplace les données par les données mockées
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      // Je fais passer le type de user a employee
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      // waitFor() me permet d'attendre qu'une condition soit vraie
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')

      expect(windowIcon).toHaveClass('active-icon')
    })

    // Issue 1
    // Inversion de l'appelation du test pour plus de clarté
    test("Then bills should be ordered from latest to earliest", () => {
      document.body.innerHTML = BillsUI({ data: bills.sort((a, b) => ((a.date < b.date) ? 1 : -1)) })
      const renderedDates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...renderedDates].sort(antiChrono)
      expect(renderedDates).toEqual(datesSorted)
    })

    // Test de la function getBills() sur son trie par ordre décroissant
    test("Test sort function", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const billsContainer = new Bills({
        document,
        onNavigate: () => { },
        store: mockStore,
        localStorage: window.localStorage
      })
      const billResult = await billsContainer.getBills()

      const expected = [
        {
          date: formatDate("2004-04-04"),
          status: formatStatus("pending")
        },
        {
          date: formatDate("2003-03-03"),
          status: formatStatus("accepted")
        },
        {
          date: formatDate("2002-02-02"),
          status: formatStatus("refused")
        },
        {
          date: formatDate("2001-01-01"),
          status: formatStatus("refused")
        }
      ]

      const simplified = billResult.map(b => ({ date: b.date, status: b.status }))
      expect(simplified).toEqual(expected)
    })

    // Vérfié que le titre et le bonton sont bien affichés
    test("Then tilte and button should be displayed", () => {
      const btnNewBill = screen.getByTestId('btn-new-bill')
      const title = screen.getAllByText('Mes notes de frais')
      expect(btnNewBill).toBeInTheDocument()
      expect(title).toBeTruthy()
    })

    // Vérifie que le formulaire de création de note de frais s'affiche bien
    describe("When I click on 'Nouvelle note de frais'", () => {
      test('Then the invoice form should appear', () => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
        Object.defineProperty(window, 'localStorage', { value: localStorageMock })
        window.localStorage.setItem('user', JSON.stringify({
          type: 'Employee'
        }))
        const bills = new Bills({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        })
        document.body.innerHTML = BillsUI({ data: bills })
        const buttonNewBill = screen.getByTestId('btn-new-bill');
        const handleClickNewBill = jest.fn(bills.handleClickNewBill);
        buttonNewBill.addEventListener('click', handleClickNewBill);
        fireEvent.click(buttonNewBill);
        expect(handleClickNewBill).toHaveBeenCalled();
      })

      // Vérifie si la modale contenant le justificatif de la note de frais apparaît
      describe('When I click on the icon eye', () => {
        test('Then a modal should appear', () => {
          const onNavigate = (pathname) => {
            document.body.innerHTML = ROUTES({ pathname })
          };
          Object.defineProperty(window, 'localStorage', { value: localStorageMock })
          window.localStorage.setItem('user', JSON.stringify({
            type: 'Employee'
          }));
          const billsPage = new Bills({
            document,
            onNavigate,
            store: mockStore,
            localStorage: window.localStorage
          });
          document.body.innerHTML = BillsUI({ data: bills });
          const iconEye = screen.getAllByTestId('icon-eye')
          const handleClickIconEye = jest.fn(billsPage.handleClickIconEye)
          const modaleFile = document.getElementById('modaleFile')
          // Je créé une fonction mockée qui me permet d'afficher la modale
          $.fn.modal = jest.fn(() => modaleFile.classList.add("show"))

          iconEye.forEach((icon) => {
            icon.addEventListener("click", handleClickIconEye(icon))
            fireEvent.click(icon)
            expect(handleClickIconEye).toHaveBeenCalled()
          });
          expect(modaleFile).toHaveClass("show")
          expect(screen.getByText("Justificatif")).toBeTruthy()
          expect(bills[0].fileUrl).toBeTruthy()
        })
      })
    })
  })
})
