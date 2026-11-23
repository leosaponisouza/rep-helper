package com.rephelper.backend.republic;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class RepublicAddress {

    @Column(name = "street", nullable = false, length = 200)
    private String street;

    @Column(name = "number", nullable = false, length = 30)
    private String number;

    @Column(name = "complement", length = 100)
    private String complement;

    @Column(name = "neighborhood", nullable = false, length = 120)
    private String neighborhood;

    @Column(name = "city", nullable = false, length = 120)
    private String city;

    @Column(name = "state", nullable = false, length = 2)
    private String state;

    @Column(name = "zip_code", nullable = false, length = 20)
    private String zipCode;

    public String getStreet() { return street; }
    public void setStreet(String street) { this.street = street; }

    public String getNumber() { return number; }
    public void setNumber(String number) { this.number = number; }

    public String getComplement() { return complement; }
    public void setComplement(String complement) { this.complement = complement; }

    public String getNeighborhood() { return neighborhood; }
    public void setNeighborhood(String neighborhood) { this.neighborhood = neighborhood; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }

    public String toFullAddress() {
        StringBuilder sb = new StringBuilder();
        sb.append(street).append(", ").append(number);
        if (complement != null && !complement.isBlank()) {
            sb.append(" - ").append(complement);
        }
        sb.append(", ").append(neighborhood)
          .append(" - ").append(city)
          .append("/").append(state)
          .append(", ").append(zipCode);
        return sb.toString();
    }

    public void apply(
            String nextStreet,
            String nextNumber,
            String nextComplement,
            String nextNeighborhood,
            String nextCity,
            String nextState,
            String nextZip,
            boolean overwriteComplement
    ) {
        if (nextStreet != null && !nextStreet.isBlank()) this.street = nextStreet.trim();
        if (nextNumber != null && !nextNumber.isBlank()) this.number = nextNumber.trim();
        if (overwriteComplement || nextComplement != null) {
            this.complement = nextComplement == null || nextComplement.isBlank() ? null : nextComplement.trim();
        }
        if (nextNeighborhood != null && !nextNeighborhood.isBlank()) this.neighborhood = nextNeighborhood.trim();
        if (nextCity != null && !nextCity.isBlank()) this.city = nextCity.trim();
        if (nextState != null && !nextState.isBlank()) this.state = nextState.trim().toUpperCase();
        if (nextZip != null && !nextZip.isBlank()) this.zipCode = nextZip.trim();
    }
}
