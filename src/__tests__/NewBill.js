/**
 * @jest-environment jsdom
 */
import { ROUTES_PATH, ROUTES } from "../constants/routes.js"
import { screen, waitFor, fireEvent } from "@testing-library/dom"
import NewBill from "../containers/NewBill.js"
import userEvent from "@testing-library/user-event"
import { localStorageMock } from "../__mocks__/localStorage.js"
import router from "../app/Router.js";
import mockStore from "../__mocks__/store.js"
import '@testing-library/jest-dom/extend-expect'

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }))
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.innerHTML = ""  // reset du DOM
    document.body.append(root)
    router()
    window.onNavigate(ROUTES_PATH.NewBill)
  })
  describe("When I am on NewBill Page", () => {

    test("Then mail icon in vertical layout should be highlighted", async () => {
      // waitFor() me permet d'attendre qu'une condition soit vraie
      await waitFor(() => screen.getByTestId('icon-mail'))
      const mailIcon = screen.getByTestId('icon-mail')

      expect(mailIcon).toHaveClass('active-icon')
    })

    test("Then title and form should be displayed", () => {
      const title = screen.getAllByText('Envoyer une note de frais')
      const form = screen.getByTestId('form-new-bill')
      expect(title).toBeTruthy()
      expect(form).toBeInTheDocument()
    })

  })
  describe("When I upload a valid file", () => {
    test("Then the file should be accepted and store.create should be called", async () => {
      const input = screen.getByTestId("file")
      const file = new File(["image content"], "image.jpg", { type: "image/jpg" })

      const newBillInstance = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: {
          bills: () => ({
            create: jest.fn().mockResolvedValue({
              fileUrl: "https://localhost/image.jpg",
              key: "123abc"
            })
          })
        },
        localStorage: window.localStorage
      })

      newBillInstance.document = document

      Object.defineProperty(input, "files", {
        value: [file],
      })

      const event = {
        preventDefault: jest.fn(),
        target: input
      }

      await newBillInstance.handleChangeFile(event)

      expect(newBillInstance.fileName).toBe("image.jpg")
      expect(newBillInstance.fileUrl).toBe("https://localhost/image.jpg")
      expect(newBillInstance.billId).toBe("123abc")
    })
    test("Then the file should be rejected and store.create shouldn't be called", async () => {
      const input = screen.getByTestId("file")
      const file = new File(["pdf content"], "document.pdf", { type: "application/pdf" })

      const mockCreate = jest.fn()
      const newBillInstance = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: {
          bills: () => ({
            create: mockCreate
          })
        },
        localStorage: window.localStorage
      })

      newBillInstance.document = document
      window.alert = jest.fn()
      Object.defineProperty(input, "files", {
        value: [file]
      })

      const event = {
        preventDefault: jest.fn(),
        target: input
      }

      await newBillInstance.handleChangeFile(event)

      expect(mockCreate).not.toHaveBeenCalled()
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("L'extension du fichier n'est pas autorisée. Les extensions valides sont : .jpg, .jpeg, .png"))
      expect(event.target.value).toBe("")
    })
    test("should catch error and call console.error when store.create fails", async () => {
      const mockError = new Error("Mocked error");

      const mockStore = {
        bills: () => ({
          create: jest.fn().mockRejectedValue(mockError), // Force une erreur
        }),
      };

      const mockNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate: mockNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Mock console.error
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => { });

      // Crée un fichier valide
      const file = new File(["dummy content"], "test.png", { type: "image/png" });
      const fileInput = screen.getByTestId("file");

      Object.defineProperty(fileInput, "files", {
        value: [file],
      });

      // Simule l'appel
      await newBill.handleChangeFile({
        preventDefault: () => { },
        target: fileInput
      });

      // Vérifie que console.error a bien été appelé avec l'erreur
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockError);

      // Nettoyage
      consoleErrorSpy.mockRestore();
    })
  })
})
describe("When I submit form", () => {
  test("Then it should add a new bill in bills and bring you to Bill page", async () => {
    const mockNavigate = jest.fn()

    const newBillInstance = new NewBill({
      document,
      onNavigate: mockNavigate,
      store: mockStore,
      localStorage: window.localStorage,
      testMode: true,

    })

    fireEvent.change(screen.getByTestId('expense-type'), { target: { value: "Transport" } })
    fireEvent.change(screen.getByTestId('expense-name'), { target: { value: "Vol Lyon" } })
    fireEvent.change(screen.getByTestId('datepicker'), { target: { value: "2021-05-15" } })
    fireEvent.change(screen.getByTestId('amount'), { target: { value: 200 } })
    fireEvent.change(screen.getByTestId('vat'), { target: { value: "70" } })
    fireEvent.change(screen.getByTestId('pct'), { target: { value: 20 } })

    const file = new File(['dummy content'], 'image.jpg', { type: 'image/jpeg' })
    const fileInput = screen.getByTestId('file')
    fireEvent.change(fileInput, { target: { files: [file] } })

    const form = screen.getByTestId("form-new-bill")
    form.addEventListener("submit", newBillInstance.handleSubmit.bind(newBillInstance))
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("#employee/bills")
    })
  })
  test("Then it should log an error if the store update fails", async () => {
    const mockError = new Error("Erreur de store")
    const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => { })

    const newBillInstance = new NewBill({
      document,
      onNavigate: jest.fn(),
      store: {
        bills: () => ({
          update: jest.fn().mockRejectedValueOnce(mockError)
        })
      },
      localStorage: window.localStorage
    })

    const form = screen.getByTestId("form-new-bill")
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(mockError)
    })

    mockConsoleError.mockRestore()
  })
})