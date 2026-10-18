from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseProvider(ABC):
    """
    Abstract Base Class defining the contract for product and offer data providers.
    All providers must identify their source provenance and implement standard search and retrieval methods.
    """

    def __init__(self, source_name: str, source_type: str):
        self.source_name = source_name
        self.source_type = source_type  # 'demo', 'dataset', 'manual', 'api'

    @abstractmethod
    def search_products(self, query: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Search products with optional query text and metadata filters.
        """
        pass

    @abstractmethod
    def get_product_details(self, product_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve complete product details and metadata by product ID.
        """
        pass

    @abstractmethod
    def get_offers(self, product_id: int) -> List[Dict[str, Any]]:
        """
        Retrieve all available offers for a specific product ID.
        """
        pass

    @abstractmethod
    def get_current_price(self, product_id: int) -> Optional[float]:
        """
        Retrieve the lowest current listed price for a given product ID.
        """
        pass
