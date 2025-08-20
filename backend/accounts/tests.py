from django.test import TestCase

# Create your tests here.
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

class AuthTests(APITestCase):
    def test_register_and_login(self):
        url = reverse('register')
        data = {
            "username": "andy",
            "email": "andy@example.com",
            "password": "secret123",
            "password2": "secret123",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)

        #Login
        url = reverse('login')
        response = self.client.post(url, {"username": "andy", "password": "secret123"})
        self.assertEqual(response.status_code, 200)

        #Get user details
        url = reverse('logout')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'andy')

        #Logout
        url = reverse('user')
        response = self.client.post(url)
        self.assertEqual(response.status_code, 204)