package com.alpendre.backend.house;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.ArrayList;
import java.util.List;

@Embeddable
public class HouseAddress {

    @Column(name = "street", length = 200)
    private String street;

    @Column(name = "number", length = 30)
    private String number;

    @Column(name = "complement", length = 100)
    private String complement;

    @Column(name = "neighborhood", length = 120)
    private String neighborhood;

    @Column(name = "city", length = 120)
    private String city;

    @Column(name = "state", length = 2)
    private String state;

    @Column(name = "zip_code", length = 20)
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
        List<String> segments = new ArrayList<>();
        if (hasText(street)) {
            StringBuilder line1 = new StringBuilder(street.trim());
            if (hasText(number)) {
                line1.append(", ").append(number.trim());
            }
            if (hasText(complement)) {
                line1.append(" - ").append(complement.trim());
            }
            segments.add(line1.toString());
        } else if (hasText(complement)) {
            segments.add(complement.trim());
        }

        if (hasText(neighborhood)) {
            segments.add(neighborhood.trim());
        }

        if (hasText(city) && hasText(state)) {
            segments.add(city.trim() + "/" + state.trim());
        } else if (hasText(city)) {
            segments.add(city.trim());
        } else if (hasText(state)) {
            segments.add(state.trim());
        }

        if (hasText(zipCode)) {
            segments.add(zipCode.trim());
        }

        return segments.isEmpty() ? "" : String.join(", ", segments);
    }

    public void apply(
            String nextStreet,
            String nextNumber,
            String nextComplement,
            String nextNeighborhood,
            String nextCity,
            String nextState,
            String nextZip,
            boolean overwriteAll
    ) {
        if (overwriteAll || nextStreet != null) this.street = normalize(nextStreet, false);
        if (overwriteAll || nextNumber != null) this.number = normalize(nextNumber, false);
        if (overwriteAll || nextComplement != null) this.complement = normalize(nextComplement, false);
        if (overwriteAll || nextNeighborhood != null) this.neighborhood = normalize(nextNeighborhood, false);
        if (overwriteAll || nextCity != null) this.city = normalize(nextCity, false);
        if (overwriteAll || nextState != null) this.state = normalize(nextState, true);
        if (overwriteAll || nextZip != null) this.zipCode = normalize(nextZip, false);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String normalize(String value, boolean upper) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return upper ? trimmed.toUpperCase() : trimmed;
    }
}
